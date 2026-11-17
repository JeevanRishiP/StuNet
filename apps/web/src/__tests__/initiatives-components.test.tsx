import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { InitiativeCard } from "@/components/initiatives/InitiativeCard";
import { InitiativeForm } from "@/components/initiatives/InitiativeForm";

describe("Initiatives Extracted Components", () => {
  describe("InitiativeCard", () => {
    it("renders company initiative card in ranking variant", () => {
      const companyItem = {
        id: "comp-1",
        name: "Acme Tech Lab",
        tagline: "Next-gen AI developer tools",
        type: "company" as const,
        stage: "SEED",
        verifiedRevenue: 50000,
        isRevenueVerified: true,
        followersCount: 15,
        founder: {
          id: "usr-1",
          displayName: "Alice Smith",
          username: "alicesmith",
          role: "CTO",
        },
      };

      const html = renderToString(
        <InitiativeCard item={companyItem} rankIndex={1} variant="ranking" />,
      );

      expect(html).toContain("Acme Tech Lab");
      expect(html).toContain("Co");
      expect(html).toContain("50,000");
      expect(html).toContain("follows");
      expect(html).toContain("#<!-- -->2");
    });

    it("renders project initiative card in network variant with founder info", () => {
      const projectItem = {
        id: "proj-1",
        name: "StuNet Mobile Companion",
        tagline: "Open-source campus networking mobile client",
        type: "project" as const,
        githubUrl: "https://github.com/stunet/mobile",
        starsCount: 142,
        primaryLanguage: "TypeScript",
        founder: {
          id: "usr-2",
          displayName: "Charlie Brown",
          username: "charlieb",
          role: "Lead Architect",
        },
      };

      const html = renderToString(<InitiativeCard item={projectItem} variant="network" />);

      expect(html).toContain("StuNet Mobile Companion");
      expect(html).toContain("Pr");
      expect(html).toContain("By @charlieb");
    });

    it("renders compact card variant properly with stage", () => {
      const initiativeItem = {
        id: "comp-2",
        name: "Solaris Clean Energy",
        tagline: "Micro-solar grids for campus dorms",
        type: "company" as const,
        stage: "GROWTH",
        followersCount: 8,
      };

      const html = renderToString(<InitiativeCard item={initiativeItem} variant="compact" />);

      expect(html).toContain("Solaris Clean Energy");
      expect(html).toContain("GROWTH");
      expect(html).toContain("follows");
    });
  });

  describe("InitiativeForm", () => {
    it("renders company registration form fields", () => {
      const html = renderToString(
        <InitiativeForm type="company" isOpen={true} onClose={() => {}} onSuccess={() => {}} />,
      );

      expect(html).toContain("Register New Company or Startup");
      expect(html).toContain("Company Name *");
      expect(html).toContain("Stage");
      expect(html).toContain("Tagline");
    });

    it("renders project registration form fields", () => {
      const html = renderToString(
        <InitiativeForm type="project" isOpen={true} onClose={() => {}} onSuccess={() => {}} />,
      );

      expect(html).toContain("Register Open Source Project");
      expect(html).toContain("Project Name *");
      expect(html).toContain("GitHub Repository URL *");
      expect(html).toContain("Primary Language");
    });
  });
});
