#!/usr/bin/env python3
"""
train.py — Standalone Python training pipeline for StuNet Feed Ranking System v2.

Architecture (Sections 4 & 5):
  1. Queries feed_impressions joined against engagement (likes, comments, views within 2h)
     to build labeled implicit-feedback training examples.
  2. Joins precomputed feature tables (author_engagement_stats, user_author_affinity)
     and per-candidate features (recency, velocity, relationship tier, tag overlap).
  3. Trains a LogisticRegression model using scikit-learn.
  4. Evaluates on a held-out temporal slice (ROC-AUC, Log Loss).
  5. Shadow Mode & Activation:
     - If data volume is below MIN_TRAINING_EXAMPLES (default 2,000) or --shadow flag is set:
       Saves model as shadow mode (is_active = False) and logs hypothetical scores.
     - Only if data volume threshold is met and new_auc > active_auc (and not in shadow mode):
       Promotes model by setting is_active = True and deactivating the old model.

Usage:
  python train.py [--shadow] [--min-examples 2000] [--db-url postgresql://...]
"""

import os
import sys
import json
import argparse
import datetime
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, log_loss
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment from project root .env
root_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(root_dir / ".env")
load_dotenv(root_dir / "apps" / "web" / ".env.local")

FEATURE_COLUMNS = [
    "hours_since_posted",
    "like_count",
    "comment_count",
    "view_count",
    "engagement_velocity",
    "is_connected",
    "is_same_campus",
    "user_author_affinity",
    "author_engagement_rate",
    "tag_overlap",
    "hour_of_day",
    "day_of_week",
    "is_anonymous",
]

DEFAULT_MIN_EXAMPLES = 2000


def get_db_connection(db_url: Optional[str] = None) -> psycopg2.extensions.connection:
    """Connects to PostgreSQL using DATABASE_URL or provided connection string."""
    url = (
        db_url
        or os.getenv("DATABASE_OWNER_URL")
        or os.getenv("DATABASE_URL")
        or "postgresql://stunet_owner:localdevonly@localhost:5434/stunet"
    )
    return psycopg2.connect(url)


def fetch_training_data(conn: psycopg2.extensions.connection) -> pd.DataFrame:
    """
    Extracts labeled examples from feed_impressions and joins features.
    Positive label = user engaged (liked, commented, or viewed) within 2h of impression.
    """
    query = """
    WITH impression_engagements AS (
      SELECT
        fi.id AS impression_id,
        fi.user_id,
        fi.post_id,
        fi.rank_position,
        fi.session_id,
        fi.shown_at,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM post_likes pl
            WHERE pl.user_id = fi.user_id
              AND pl.post_id = fi.post_id
              AND pl.created_at >= fi.shown_at
              AND pl.created_at <= fi.shown_at + INTERVAL '2 hours'
          ) THEN 1
          WHEN EXISTS (
            SELECT 1 FROM post_comments pc
            WHERE pc.user_id = fi.user_id
              AND pc.post_id = fi.post_id
              AND pc.created_at >= fi.shown_at
              AND pc.created_at <= fi.shown_at + INTERVAL '2 hours'
          ) THEN 1
          WHEN EXISTS (
            SELECT 1 FROM post_views pv
            WHERE pv.user_id = fi.user_id
              AND pv.post_id = fi.post_id
              AND pv.last_viewed_at >= fi.shown_at
              AND pv.last_viewed_at <= fi.shown_at + INTERVAL '2 hours'
          ) THEN 1
          ELSE 0
        END AS label
      FROM feed_impressions fi
      WHERE fi.shown_at >= NOW() - INTERVAL '60 days'
    ),
    viewer_tags AS (
      SELECT DISTINCT pl.user_id, t.tag_id
      FROM post_likes pl
      JOIN taggables t ON t.taggable_type = 'POST' AND t.taggable_id = pl.post_id
      UNION
      SELECT DISTINCT pc.user_id, t.tag_id
      FROM post_comments pc
      JOIN taggables t ON t.taggable_type = 'POST' AND t.taggable_id = pc.post_id
    )
    SELECT
      ie.impression_id,
      ie.shown_at,
      ie.label,
      GREATEST(0.01, EXTRACT(EPOCH FROM (ie.shown_at - p.created_at)) / 3600.0) AS hours_since_posted,
      p.like_count::float AS like_count,
      p.comment_count::float AS comment_count,
      p.view_count::float AS view_count,
      ((p.like_count + p.comment_count * 2.0) / GREATEST(1.0, EXTRACT(EPOCH FROM (ie.shown_at - p.created_at)) / 3600.0))::float AS engagement_velocity,
      CASE WHEN conn.id IS NOT NULL THEN 1.0 ELSE 0.0 END AS is_connected,
      CASE WHEN u_viewer.campus_id IS NOT NULL AND u_viewer.campus_id = u_author.campus_id AND conn.id IS NULL THEN 1.0 ELSE 0.0 END AS is_same_campus,
      COALESCE(uaa.affinity_score, 0.0)::float AS user_author_affinity,
      COALESCE(aes.avg_likes_per_post_30d, 0.0)::float AS author_engagement_rate,
      COALESCE(
        (
          SELECT COUNT(DISTINCT pt.tag_id)::float / NULLIF(COUNT(DISTINCT pt2.tag_id), 0)
          FROM taggables pt2
          LEFT JOIN viewer_tags pt ON pt.tag_id = pt2.tag_id AND pt.user_id = ie.user_id
          WHERE pt2.taggable_type = 'POST' AND pt2.taggable_id = p.id
        ),
        0.0
      )::float AS tag_overlap,
      EXTRACT(HOUR FROM ie.shown_at)::float AS hour_of_day,
      EXTRACT(DOW FROM ie.shown_at)::float AS day_of_week,
      CASE WHEN p.is_anonymous THEN 1.0 ELSE 0.0 END AS is_anonymous
    FROM impression_engagements ie
    JOIN posts p ON p.id = ie.post_id
    JOIN user_identity u_viewer ON u_viewer.id = ie.user_id
    JOIN user_identity u_author ON u_author.id = p.author_id
    LEFT JOIN connections conn ON conn.status = 'ACCEPTED' AND (
      (conn.sender_id = ie.user_id AND conn.receiver_id = p.author_id) OR
      (conn.receiver_id = ie.user_id AND conn.sender_id = p.author_id)
    )
    LEFT JOIN user_author_affinity uaa ON uaa.viewer_user_id = ie.user_id AND uaa.author_user_id = p.author_id
    LEFT JOIN author_engagement_stats aes ON aes.author_user_id = p.author_id
    ORDER BY ie.shown_at ASC;
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        rows = cur.fetchall()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    df["label"] = df["label"].astype(int)
    return df


def generate_synthetic_shadow_dataset(n_samples: int = 500) -> pd.DataFrame:
    """
    Generates realistic synthetic impression data to test model convergence,
    shadow evaluation, and coefficients extraction when the database is in early cold start.
    """
    np.random.seed(42)
    hours_since_posted = np.random.exponential(scale=12.0, size=n_samples) + 0.05
    like_count = np.random.poisson(lam=5.0, size=n_samples)
    comment_count = np.random.poisson(lam=1.5, size=n_samples)
    view_count = like_count * 4 + np.random.poisson(lam=10.0, size=n_samples)
    engagement_velocity = (like_count + comment_count * 2.0) / np.maximum(1.0, hours_since_posted)

    is_connected = np.random.binomial(n=1, p=0.25, size=n_samples).astype(float)
    is_same_campus = np.where(is_connected == 1, 0.0, np.random.binomial(n=1, p=0.5, size=n_samples)).astype(float)
    user_author_affinity = np.where(is_connected == 1, np.random.beta(a=2, b=3, size=n_samples), 0.0)
    author_engagement_rate = np.random.gamma(shape=2.0, scale=2.5, size=n_samples)
    tag_overlap = np.random.choice([0.0, 0.25, 0.5, 0.75, 1.0], size=n_samples, p=[0.5, 0.2, 0.15, 0.1, 0.05])

    hour_of_day = np.random.randint(0, 24, size=n_samples).astype(float)
    day_of_week = np.random.randint(0, 7, size=n_samples).astype(float)
    is_anonymous = np.random.binomial(n=1, p=0.1, size=n_samples).astype(float)

    # Engagement logits based on realistic feature weights
    logits = (
        -2.5
        + 0.8 * np.log1p(engagement_velocity)
        + 0.9 * is_connected
        + 0.4 * is_same_campus
        + 1.2 * user_author_affinity
        + 0.1 * author_engagement_rate
        + 0.7 * tag_overlap
        - 0.03 * np.minimum(hours_since_posted, 72.0)
        - 0.2 * is_anonymous
    )
    probs = 1.0 / (1.0 + np.exp(-logits))
    labels = np.random.binomial(n=1, p=probs, size=n_samples)

    df = pd.DataFrame({
        "impression_id": [f"synth_{i}" for i in range(n_samples)],
        "shown_at": pd.date_range(end=datetime.datetime.now(), periods=n_samples, freq="5min"),
        "label": labels,
        "hours_since_posted": hours_since_posted,
        "like_count": like_count.astype(float),
        "comment_count": comment_count.astype(float),
        "view_count": view_count.astype(float),
        "engagement_velocity": engagement_velocity,
        "is_connected": is_connected,
        "is_same_campus": is_same_campus,
        "user_author_affinity": user_author_affinity,
        "author_engagement_rate": author_engagement_rate,
        "tag_overlap": tag_overlap,
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "is_anonymous": is_anonymous,
    })
    return df


def get_active_model(conn: psycopg2.extensions.connection) -> Optional[Dict[str, Any]]:
    """Retrieves the currently active model from feed_model_versions."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, trained_at, validation_auc, training_example_count, coefficients_json
            FROM feed_model_versions
            WHERE is_active = true
            ORDER BY trained_at DESC
            LIMIT 1;
            """
        )
        return cur.fetchone()


def train_and_evaluate(
    df: pd.DataFrame,
    min_examples: int = DEFAULT_MIN_EXAMPLES,
    force_shadow: bool = False,
) -> Tuple[Dict[str, Any], float, float, bool]:
    """
    Trains logistic regression on 80% temporal train set, evaluates on 20% test slice.
    Returns (coefficients_json, validation_auc, validation_log_loss, is_eligible_for_activation).
    """
    n_total = len(df)
    is_eligible = (n_total >= min_examples) and not force_shadow

    # Ensure class balance exists
    n_pos = int(df["label"].sum())
    n_neg = n_total - n_pos
    if n_pos < 5 or n_neg < 5:
        raise ValueError(
            f"Insufficient class variance for supervised training: {n_pos} positive, {n_neg} negative examples."
        )

    # Temporal split: first 80% chronologically for train, last 20% for validation
    split_idx = int(n_total * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    # Fallback to stratified sample if split has zero positives in test slice
    if test_df["label"].nunique() < 2:
        from sklearn.model_selection import train_test_split
        train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["label"])

    X_train = train_df[FEATURE_COLUMNS].to_numpy()
    y_train = train_df["label"].to_numpy()

    X_test = test_df[FEATURE_COLUMNS].to_numpy()
    y_test = test_df["label"].to_numpy()

    # Train L2-regularized Logistic Regression (default penalty in scikit-learn)
    clf = LogisticRegression(
        C=1.0,
        max_iter=1000,
        solver="lbfgs",
        random_state=42,
    )
    clf.fit(X_train, y_train)

    # Evaluate on held-out slice
    y_pred_proba = clf.predict_proba(X_test)[:, 1]
    val_auc = float(roc_auc_score(y_test, y_pred_proba))
    val_loss = float(log_loss(y_test, y_pred_proba))

    # Build coefficients JSON structure for TypeScript serving path
    feature_weights = {
        col: round(float(clf.coef_[0][i]), 6)
        for i, col in enumerate(FEATURE_COLUMNS)
    }
    intercept = round(float(clf.intercept_[0]), 6)

    coefficients_json = {
        "features": feature_weights,
        "intercept": intercept,
        "feature_order": FEATURE_COLUMNS,
    }

    return coefficients_json, val_auc, val_loss, is_eligible


def save_model_version(
    conn: psycopg2.extensions.connection,
    coefficients_json: Dict[str, Any],
    training_example_count: int,
    validation_auc: float,
    is_active: bool,
) -> str:
    """Inserts a new feed_model_versions row and updates is_active state."""
    with conn.cursor() as cur:
        if is_active:
            # Deactivate any previous active model
            cur.execute("UPDATE feed_model_versions SET is_active = false WHERE is_active = true;")

        cur.execute(
            """
            INSERT INTO feed_model_versions (
              id,
              trained_at,
              model_type,
              coefficients_json,
              training_example_count,
              validation_auc,
              is_active
            )
            VALUES (
              gen_random_uuid(),
              NOW(),
              'LOGISTIC_REGRESSION',
              %s,
              %s,
              %s,
              %s
            )
            RETURNING id;
            """,
            (
                json.dumps(coefficients_json),
                training_example_count,
                round(validation_auc, 4),
                is_active,
            ),
        )
        model_id = cur.fetchone()[0]
        conn.commit()
        return str(model_id)


def run_shadow_simulation(coefficients_json: Dict[str, Any], df: pd.DataFrame) -> None:
    """Simulates shadow scoring on sample candidates and prints comparison."""
    weights = coefficients_json["features"]
    intercept = coefficients_json["intercept"]

    sample = df.head(5)
    print("\n--- SHADOW MODE SCORING SAMPLE (Top 5 Impressions) ---")
    print(f"{'Impression ID':<15} {'Label':<7} {'Model Score':<14} {'Heuristic Sim':<15} {'Affinity':<10} {'Connected'}")
    print("-" * 75)

    for _, row in sample.iterrows():
        # Dot product
        z = intercept + sum(weights[col] * row[col] for col in FEATURE_COLUMNS)
        prob = 1.0 / (1.0 + np.exp(-np.clip(z, -20, 20)))

        # Heuristic proxy for comparison
        heuristic_sim = (
            (1.0 if row["is_connected"] > 0 else 0.5)
            * (1.0 + row["user_author_affinity"] * 2.0)
            * (row["like_count"] + row["comment_count"] * 2.0 + 1.0)
            / np.maximum(1.0, row["hours_since_posted"] ** 0.8)
        )

        print(
            f"{str(row['impression_id'])[:14]:<15} "
            f"{int(row['label']):<7} "
            f"{prob:<14.4f} "
            f"{heuristic_sim:<15.2f} "
            f"{row['user_author_affinity']:<10.2f} "
            f"{int(row['is_connected'])}"
        )
    print("-" * 75)


def main():
    parser = argparse.ArgumentParser(description="StuNet Feed Ranking Offline Trainer")
    parser.add_argument(
        "--shadow",
        action="store_true",
        default=False,
        help="Run in shadow mode: log what would be scored without activating the model in production.",
    )
    parser.add_argument(
        "--min-examples",
        type=int,
        default=DEFAULT_MIN_EXAMPLES,
        help=f"Minimum training examples required to consider activating the model (default: {DEFAULT_MIN_EXAMPLES}).",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="PostgreSQL connection string.",
    )
    parser.add_argument(
        "--allow-synthetic",
        action="store_true",
        default=False,
        help="Fallback to synthetic impression calibration if DB has insufficient live impressions.",
    )

    args = parser.parse_args()

    print("=" * 70)
    print(" StuNet Feed Ranking System v2 — Offline Training Pipeline")
    print("=" * 70)

    conn = get_db_connection(args.db_url)
    print(f"Connected to PostgreSQL database.")

    # 1. Fetch live impressions
    print("Fetching training impressions from feed_impressions...")
    df = fetch_training_data(conn)
    live_count = len(df)
    print(f"Retrieved {live_count} live impression records.")

    is_synthetic = False
    if live_count < args.min_examples:
        print(f"\n[DATA VOLUME FLAG]: Live impression count ({live_count}) is below the {args.min_examples} threshold.")
        print("As per Section 5/8 of the design spec, model-based scoring must remain inactive until sufficient real usage accumulates.")

        if live_count < 20 or args.allow_synthetic:
            print("[SHADOW MODE]: Using calibrated shadow dataset to verify training math & offline evaluation.")
            df = generate_synthetic_shadow_dataset(n_samples=600)
            is_synthetic = True
        else:
            print("[SHADOW MODE]: Training in shadow mode on available live impressions.")

    # 2. Train model
    print(f"\nTraining Logistic Regression on {len(df)} examples (Features: {len(FEATURE_COLUMNS)})...")
    try:
        coefficients_json, val_auc, val_loss, is_eligible = train_and_evaluate(
            df,
            min_examples=args.min_examples,
            force_shadow=args.shadow or is_synthetic,
        )
    except Exception as e:
        print(f"Training failed: {e}")
        conn.close()
        sys.exit(1)

    print(f"Training complete.")
    print(f"  - Validation AUC:      {val_auc:.4f}")
    print(f"  - Validation Log Loss: {val_loss:.4f}")
    print(f"  - Model Intercept:     {coefficients_json['intercept']:.4f}")

    print("\nFeature Weights (Top 5 positive & negative):")
    sorted_weights = sorted(
        coefficients_json["features"].items(),
        key=lambda item: item[1],
        reverse=True,
    )
    for feat, weight in sorted_weights[:5]:
        print(f"  [+] {feat:<25}: +{weight:.4f}")
    for feat, weight in sorted_weights[-3:]:
        print(f"  [-] {feat:<25}: {weight:.4f}")

    # 3. Model comparison & activation check
    active_model = get_active_model(conn)
    should_activate = False

    if active_model:
        active_auc = float(active_model["validation_auc"] or 0.0)
        print(f"\nCurrently active model found (ID: {active_model['id']}, AUC: {active_auc:.4f}).")
        if is_eligible and (val_auc > active_auc):
            print(f"New model outperforms active model ({val_auc:.4f} > {active_auc:.4f}). Eligible for activation.")
            should_activate = True
        else:
            print(f"New model will NOT replace active model (Eligible: {is_eligible}, New AUC: {val_auc:.4f} vs Active: {active_auc:.4f}).")
    else:
        print("\nNo currently active model in feed_model_versions.")
        if is_eligible:
            print("Sufficient volume reached. First model eligible for activation.")
            should_activate = True
        else:
            print("Volume threshold not reached or shadow flag set. Storing as SHADOW model (is_active = false).")

    # 4. Save to feed_model_versions
    model_id = save_model_version(
        conn=conn,
        coefficients_json=coefficients_json,
        training_example_count=len(df),
        validation_auc=val_auc,
        is_active=should_activate,
    )

    print(f"\nSaved model version to DB:")
    print(f"  - ID:        {model_id}")
    print(f"  - Active:    {should_activate}")
    print(f"  - Examples:  {len(df)}")
    print(f"  - AUC:       {val_auc:.4f}")

    # 5. Run shadow simulation preview
    run_shadow_simulation(coefficients_json, df)

    conn.close()
    print("Offline training run complete.\n")


if __name__ == "__main__":
    main()
