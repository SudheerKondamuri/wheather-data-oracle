const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("WeatherOracle", function () {
  // =====================================================
  // Fixture — deploys MockLinkToken + WeatherOracle
  // =====================================================
  async function deployWeatherOracleFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Mock LINK Token
    const MockLinkToken = await ethers.getContractFactory("MockLinkToken");
    const linkToken = await MockLinkToken.deploy();
    await linkToken.waitForDeployment();
    const linkAddress = await linkToken.getAddress();

    // Deploy WeatherOracle
    const WeatherOracleFactory = await ethers.getContractFactory("WeatherOracle");
    const jobId = ethers.encodeBytes32String("testJobId");
    const fee = ethers.parseEther("0.1");

    const oracle = await WeatherOracleFactory.deploy(
      linkAddress,
      owner.address, // Owner acts as mock Chainlink oracle
      jobId,
      fee
    );
    await oracle.waitForDeployment();

    return { oracle, linkToken, owner, addr1, addr2, jobId, fee, linkAddress };
  }

  /**
   * Helper: Fund the oracle contract with LINK, make a request,
   * and return the requestId from the emitted event.
   */
  async function fundAndRequest(oracle, linkToken, city = "London") {
    const oracleAddress = await oracle.getAddress();
    await linkToken.transfer(oracleAddress, ethers.parseEther("10"));

    const tx = await oracle.requestWeather(city);
    const receipt = await tx.wait();

    const event = receipt.logs.find((log) => {
      try {
        const parsed = oracle.interface.parseLog(log);
        return parsed && parsed.name === "WeatherRequested";
      } catch {
        return false;
      }
    });

    const parsed = oracle.interface.parseLog(event);
    return parsed.args.requestId;
  }

  // =====================================================
  // Deployment & Constructor
  // =====================================================
  describe("Deployment", function () {
    it("Should deploy with correct Chainlink configuration", async function () {
      const { oracle, owner, linkAddress } = await loadFixture(deployWeatherOracleFixture);
      expect(await oracle.getOracle()).to.equal(owner.address);
      expect(await oracle.getFee()).to.equal(ethers.parseEther("0.1"));
    });

    it("Should reject zero LINK address in constructor", async function () {
      const [owner] = await ethers.getSigners();
      const WeatherOracleFactory = await ethers.getContractFactory("WeatherOracle");
      const jobId = ethers.encodeBytes32String("testJobId");
      const fee = ethers.parseEther("0.1");

      await expect(
        WeatherOracleFactory.deploy(ethers.ZeroAddress, owner.address, jobId, fee)
      ).to.be.revertedWith("Invalid LINK address");
    });

    it("Should reject zero oracle address in constructor", async function () {
      const { linkAddress } = await loadFixture(deployWeatherOracleFixture);
      const WeatherOracleFactory = await ethers.getContractFactory("WeatherOracle");
      const jobId = ethers.encodeBytes32String("testJobId");
      const fee = ethers.parseEther("0.1");

      await expect(
        WeatherOracleFactory.deploy(linkAddress, ethers.ZeroAddress, jobId, fee)
      ).to.be.revertedWith("Invalid oracle address");
    });
  });

  // =====================================================
  // requestWeather
  // =====================================================
  describe("requestWeather", function () {
    it("Should revert if contract has insufficient LINK", async function () {
      const { oracle } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.requestWeather("London")).to.be.revertedWith("Insufficient LINK");
    });

    it("Should revert if city is empty string", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      await linkToken.transfer(oracleAddress, ethers.parseEther("1"));

      await expect(oracle.requestWeather("")).to.be.revertedWith("City cannot be empty");
    });

    it("Should emit WeatherRequested event on successful request", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      await linkToken.transfer(oracleAddress, ethers.parseEther("1"));

      await expect(oracle.requestWeather("London"))
        .to.emit(oracle, "WeatherRequested");
    });

    it("Should emit WeatherRequested with correct city and requester", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      await linkToken.transfer(oracleAddress, ethers.parseEther("1"));

      const tx = await oracle.requestWeather("Tokyo");
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed && parsed.name === "WeatherRequested";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsed = oracle.interface.parseLog(event);
      expect(parsed.args.city).to.equal("Tokyo");
      expect(parsed.args.requester).to.equal(owner.address);
    });

    it("Should store requester and city for the request", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Paris");

      expect(await oracle.requestToRequester(requestId)).to.equal(owner.address);
      expect(await oracle.requestToCity(requestId)).to.equal("Paris");
    });

    it("Should allow multiple sequential requests", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      await linkToken.transfer(oracleAddress, ethers.parseEther("10"));

      const tx1 = await oracle.requestWeather("London");
      const tx2 = await oracle.requestWeather("Berlin");
      const tx3 = await oracle.requestWeather("Tokyo");

      await expect(tx1).to.emit(oracle, "WeatherRequested");
      await expect(tx2).to.emit(oracle, "WeatherRequested");
      await expect(tx3).to.emit(oracle, "WeatherRequested");
    });

    it("Should allow any address to request weather", async function () {
      const { oracle, linkToken, addr1 } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      await linkToken.transfer(oracleAddress, ethers.parseEther("1"));

      await expect(oracle.connect(addr1).requestWeather("Mumbai"))
        .to.emit(oracle, "WeatherRequested");
    });
  });

  // =====================================================
  // Fulfill Callback & Data Parsing
  // =====================================================
  describe("fulfill", function () {
    it("Should parse pipe-delimited data and store correctly", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Berlin");

      // Fulfill with pipe-delimited weather data: "2050|clear sky"
      await oracle.fulfill(requestId, "2050|clear sky");

      const report = await oracle.weatherReports(requestId);
      expect(report.city).to.equal("Berlin");
      expect(report.temperature).to.equal(2050); // 20.50°C * 100
      expect(report.description).to.equal("clear sky");
      expect(report.timestamp).to.be.greaterThan(0);
    });

    it("Should emit WeatherReported event with correct fields", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "London");

      const tx = await oracle.fulfill(requestId, "1850|overcast clouds");
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed && parsed.name === "WeatherReported";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsed = oracle.interface.parseLog(event);
      expect(parsed.args.requestId).to.equal(requestId);
      expect(parsed.args.city).to.equal("London");
      expect(parsed.args.temperature).to.equal(1850);
      expect(parsed.args.description).to.equal("overcast clouds");
      expect(parsed.args.requester).to.equal(owner.address);
    });

    it("Should handle negative temperatures correctly", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Moscow");

      await oracle.fulfill(requestId, "-1500|heavy snow");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(-1500); // -15.00°C
      expect(report.description).to.equal("heavy snow");
    });

    it("Should handle zero temperature", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Reykjavik");

      await oracle.fulfill(requestId, "0|freezing fog");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(0);
      expect(report.description).to.equal("freezing fog");
    });

    it("Should handle empty weather data gracefully", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Unknown");

      await oracle.fulfill(requestId, "");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(0);
      expect(report.description).to.equal("unknown");
    });

    it("Should handle data without pipe delimiter", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Nowhere");

      await oracle.fulfill(requestId, "just a string with no pipe");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(0);
      expect(report.description).to.equal("just a string with no pipe");
    });

    it("Should handle data with pipe but empty description", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Edge");

      await oracle.fulfill(requestId, "3000|");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(3000);
      expect(report.description).to.equal("unknown");
    });

    it("Should handle very high temperatures", async function () {
      const { oracle, linkToken } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "Death Valley");

      await oracle.fulfill(requestId, "5670|extreme heat");

      const report = await oracle.weatherReports(requestId);
      expect(report.temperature).to.equal(5670); // 56.70°C
    });

    it("Should reject fulfill from non-oracle address", async function () {
      const { oracle, linkToken, addr1 } = await loadFixture(deployWeatherOracleFixture);
      const requestId = await fundAndRequest(oracle, linkToken, "London");

      // addr1 is not the registered oracle, should revert
      await expect(
        oracle.connect(addr1).fulfill(requestId, "2000|sunny")
      ).to.be.reverted;
    });
  });

  // =====================================================
  // Access Control (Ownable)
  // =====================================================
  describe("Access Control", function () {
    it("Should only allow owner to update oracle address", async function () {
      const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.connect(addr1).setChainlinkOracle(addr1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow owner to update jobId", async function () {
      const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
      const newJobId = ethers.encodeBytes32String("newJob");
      await expect(oracle.connect(addr1).setJobId(newJobId))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow owner to update fee", async function () {
      const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.connect(addr1).setFee(ethers.parseEther("0.2")))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow owner to withdraw LINK", async function () {
      const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.connect(addr1).withdrawLink())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update jobId successfully", async function () {
      const { oracle } = await loadFixture(deployWeatherOracleFixture);
      const newJobId = ethers.encodeBytes32String("newJobId");
      await expect(oracle.setJobId(newJobId)).to.not.be.reverted;
    });

    it("Should allow owner to update fee successfully", async function () {
      const { oracle } = await loadFixture(deployWeatherOracleFixture);
      await oracle.setFee(ethers.parseEther("0.2"));
      expect(await oracle.getFee()).to.equal(ethers.parseEther("0.2"));
    });

    it("Should allow owner to update oracle address successfully", async function () {
      const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.setChainlinkOracle(addr1.address)).to.not.be.reverted;
      expect(await oracle.getOracle()).to.equal(addr1.address);
    });

    it("Should reject setting zero address as oracle", async function () {
      const { oracle } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.setChainlinkOracle(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid oracle address");
    });
  });

  // =====================================================
  // LINK Withdrawal
  // =====================================================
  describe("LINK Withdrawal", function () {
    it("Should allow owner to withdraw LINK tokens", async function () {
      const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();
      const amount = ethers.parseEther("5");

      // Fund the oracle
      await linkToken.transfer(oracleAddress, amount);
      const balanceBefore = await linkToken.balanceOf(owner.address);

      // Withdraw
      await oracle.withdrawLink();

      expect(await linkToken.balanceOf(oracleAddress)).to.equal(0);
      const balanceAfter = await linkToken.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should revert if no LINK to withdraw", async function () {
      const { oracle } = await loadFixture(deployWeatherOracleFixture);
      await expect(oracle.withdrawLink()).to.be.revertedWith("No LINK to withdraw");
    });
  });

  // =====================================================
  // ETH Handling
  // =====================================================
  describe("ETH Handling", function () {
    it("Should accept ETH via receive function", async function () {
      const { oracle, owner } = await loadFixture(deployWeatherOracleFixture);
      const oracleAddress = await oracle.getAddress();

      await owner.sendTransaction({
        to: oracleAddress,
        value: ethers.parseEther("1.0"),
      });

      const balance = await ethers.provider.getBalance(oracleAddress);
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });
  });
});