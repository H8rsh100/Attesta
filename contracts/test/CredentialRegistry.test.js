const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry;
  let admin;
  let issuer;
  let nonIssuer;
  let subject;

  // Sample credential data
  const credentialId = ethers.id("credential-001");
  const credentialHash = ethers.id("credential-data-hash");
  const subjectHash = ethers.id("subject-wallet-hash");

  beforeEach(async function () {
    [admin, issuer, nonIssuer, subject] = await ethers.getSigners();

    const CredentialRegistry = await ethers.getContractFactory(
      "CredentialRegistry"
    );
    registry = await CredentialRegistry.deploy(admin.address);
    await registry.waitForDeployment();

    // Grant ISSUER_ROLE to the issuer account
    const ISSUER_ROLE = await registry.ISSUER_ROLE();
    await registry.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
  });

  // -------------------------------------------------------------------------
  // issuance
  // -------------------------------------------------------------------------

  describe("issueCredential", function () {
    it("should allow an issuer to issue a credential", async function () {
      await expect(
        registry
          .connect(issuer)
          .issueCredential(credentialId, credentialHash, subjectHash)
      )
        .to.emit(registry, "CredentialIssued")
        .withArgs(credentialId, issuer.address, subjectHash, (t) => t > 0n);

      const [valid, returnedIssuer, , , , revoked] =
        await registry.verifyCredential(credentialId);
      expect(valid).to.be.true;
      expect(returnedIssuer).to.equal(issuer.address);
      expect(revoked).to.be.false;
    });

    it("should revert when a non-issuer tries to issue", async function () {
      await expect(
        registry
          .connect(nonIssuer)
          .issueCredential(credentialId, credentialHash, subjectHash)
      ).to.be.reverted;
    });

    it("should revert when issuing a duplicate credential ID", async function () {
      await registry
        .connect(issuer)
        .issueCredential(credentialId, credentialHash, subjectHash);

      await expect(
        registry
          .connect(issuer)
          .issueCredential(credentialId, credentialHash, subjectHash)
      ).to.be.revertedWith("Credential already exists");
    });

    it("should revert when credential hash is zero", async function () {
      await expect(
        registry
          .connect(issuer)
          .issueCredential(credentialId, ethers.ZeroHash, subjectHash)
      ).to.be.revertedWith("Invalid credential hash");
    });

    it("should revert when subject hash is zero", async function () {
      await expect(
        registry
          .connect(issuer)
          .issueCredential(credentialId, credentialHash, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid subject hash");
    });
  });

  // -------------------------------------------------------------------------
  // revocation
  // -------------------------------------------------------------------------

  describe("revokeCredential", function () {
    beforeEach(async function () {
      await registry
        .connect(issuer)
        .issueCredential(credentialId, credentialHash, subjectHash);
    });

    it("should allow the original issuer to revoke", async function () {
      await expect(registry.connect(issuer).revokeCredential(credentialId))
        .to.emit(registry, "CredentialRevoked")
        .withArgs(credentialId, issuer.address, (t) => t > 0n);

      const [valid, , , , , revoked] =
        await registry.verifyCredential(credentialId);
      expect(valid).to.be.false;
      expect(revoked).to.be.true;
    });

    it("should revert when a different issuer tries to revoke", async function () {
      const ISSUER_ROLE = await registry.ISSUER_ROLE();
      await registry.connect(admin).grantRole(ISSUER_ROLE, nonIssuer.address);

      await expect(
        registry.connect(nonIssuer).revokeCredential(credentialId)
      ).to.be.revertedWith("Only original issuer can revoke");
    });

    it("should revert when a non-issuer tries to revoke", async function () {
      await expect(
        registry.connect(nonIssuer).revokeCredential(credentialId)
      ).to.be.reverted;
    });

    it("should revert when trying to revoke a non-existent credential", async function () {
      await expect(
        registry.connect(issuer).revokeCredential(ethers.id("fake-id"))
      ).to.be.revertedWith("Credential does not exist");
    });

    it("should revert when trying to revoke an already revoked credential", async function () {
      await registry.connect(issuer).revokeCredential(credentialId);
      await expect(
        registry.connect(issuer).revokeCredential(credentialId)
      ).to.be.revertedWith("Credential already revoked");
    });
  });

  // -------------------------------------------------------------------------
  // verification
  // -------------------------------------------------------------------------

  describe("verifyCredential", function () {
    it("should return valid=false for a non-existent credential", async function () {
      const [valid, , , , issuedAt] = await registry.verifyCredential(
        ethers.id("nonexistent")
      );
      expect(valid).to.be.false;
      expect(issuedAt).to.equal(0n);
    });

    it("should return full credential data after issuance", async function () {
      await registry
        .connect(issuer)
        .issueCredential(credentialId, credentialHash, subjectHash);

      const [valid, returnedIssuer, retSubjectHash, retCredHash, issuedAt, revoked] =
        await registry.verifyCredential(credentialId);

      expect(valid).to.be.true;
      expect(returnedIssuer).to.equal(issuer.address);
      expect(retSubjectHash).to.equal(subjectHash);
      expect(retCredHash).to.equal(credentialHash);
      expect(issuedAt).to.be.greaterThan(0n);
      expect(revoked).to.be.false;
    });

    it("should return valid=false after revocation", async function () {
      await registry
        .connect(issuer)
        .issueCredential(credentialId, credentialHash, subjectHash);
      await registry.connect(issuer).revokeCredential(credentialId);

      const [valid, , , , , revoked] = await registry.verifyCredential(credentialId);
      expect(valid).to.be.false;
      expect(revoked).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // access control admin
  // -------------------------------------------------------------------------

  describe("AccessControl", function () {
    it("should allow admin to grant ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await registry.ISSUER_ROLE();
      await registry.connect(admin).grantRole(ISSUER_ROLE, nonIssuer.address);
      expect(await registry.hasRole(ISSUER_ROLE, nonIssuer.address)).to.be.true;
    });

    it("should allow admin to revoke ISSUER_ROLE", async function () {
      const ISSUER_ROLE = await registry.ISSUER_ROLE();
      await registry.connect(admin).revokeRole(ISSUER_ROLE, issuer.address);
      expect(await registry.hasRole(ISSUER_ROLE, issuer.address)).to.be.false;
    });

    it("should prevent non-admin from granting roles", async function () {
      const ISSUER_ROLE = await registry.ISSUER_ROLE();
      await expect(
        registry.connect(nonIssuer).grantRole(ISSUER_ROLE, nonIssuer.address)
      ).to.be.reverted;
    });
  });
});
