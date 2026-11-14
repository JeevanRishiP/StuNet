"""
test_train.py — Automated tests for the offline ML training pipeline.
"""
import os
import sys
import json
import pytest
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train import (
    FEATURE_COLUMNS,
    generate_synthetic_shadow_dataset,
    train_and_evaluate,
    DEFAULT_MIN_EXAMPLES,
)


def test_feature_columns_definition():
    assert len(FEATURE_COLUMNS) == 13
    assert "hours_since_posted" in FEATURE_COLUMNS
    assert "engagement_velocity" in FEATURE_COLUMNS
    assert "user_author_affinity" in FEATURE_COLUMNS
    assert "author_engagement_rate" in FEATURE_COLUMNS
    assert "tag_overlap" in FEATURE_COLUMNS


def test_synthetic_shadow_dataset_generation():
    df = generate_synthetic_shadow_dataset(n_samples=200)
    assert len(df) == 200
    assert "label" in df.columns
    assert set(FEATURE_COLUMNS).issubset(set(df.columns))
    # Must have both positive and negative labels
    assert df["label"].nunique() == 2
    assert df["label"].sum() > 0


def test_train_and_evaluate_shadow_mode():
    df = generate_synthetic_shadow_dataset(n_samples=400)

    # Force shadow mode
    coefficients_json, val_auc, val_loss, is_eligible = train_and_evaluate(
        df,
        min_examples=DEFAULT_MIN_EXAMPLES,
        force_shadow=True,
    )

    # In shadow mode with fewer than 2000 examples, should not be eligible for activation
    assert is_eligible is False

    # Coefficients structure
    assert "features" in coefficients_json
    assert "intercept" in coefficients_json
    assert "feature_order" in coefficients_json
    assert len(coefficients_json["features"]) == len(FEATURE_COLUMNS)
    assert isinstance(coefficients_json["intercept"], float)

    # Evaluation metrics
    assert 0.5 <= val_auc <= 1.0
    assert val_loss > 0.0


def test_train_and_evaluate_eligible_activation():
    # If example count >= min_examples and not shadow mode
    df = generate_synthetic_shadow_dataset(n_samples=500)

    coefficients_json, val_auc, val_loss, is_eligible = train_and_evaluate(
        df,
        min_examples=300,
        force_shadow=False,
    )

    assert is_eligible is True
    assert 0.5 <= val_auc <= 1.0


def test_dot_product_scoring_consistency():
    df = generate_synthetic_shadow_dataset(n_samples=100)
    coefficients_json, _, _, _ = train_and_evaluate(df, min_examples=50, force_shadow=True)

    weights = coefficients_json["features"]
    intercept = coefficients_json["intercept"]

    # Compute dot product for first row
    first_row = df.iloc[0]
    z = intercept + sum(weights[col] * float(first_row[col]) for col in FEATURE_COLUMNS)
    prob = 1.0 / (1.0 + np.exp(-z))

    assert 0.0 <= prob <= 1.0
