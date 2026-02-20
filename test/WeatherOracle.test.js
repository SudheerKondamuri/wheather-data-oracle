const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("WeatherOracle", function () {
  async function deployWeatherOracleFixture() {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Mock LINK Token
    const MockLinkToken = await ethers.getContractFactory("MockLinkToken");
    const linkToken = await MockLinkToken.deploy();
    await linkToken.waitForDeployment();

    const linkAddress = await linkToken.getAddress();

    // Deploy WeatherOracle
    const WeatherOracleFactory = await ethers.getContractFactory("WeatherOracle");
    const jobId = ethers.encodeBytes32String("jobId");
    const fee = ethers.parseEther("0.1");
    
    const oracle = await WeatherOracleFactory.deploy(
      linkAddress,
      owner.address, // Mock oracle address
      jobId,
      fee
    );
    await oracle.waitForDeployment();

    return { oracle, linkToken, owner, addr1, jobId, fee };
  }

  it("Should fail if the contract has insufficient LINK", async function () {
    const { oracle } = await loadFixture(deployWeatherOracleFixture);
    await expect(oracle.requestWeather("London")).to.be.revertedWith("Insufficient LINK");
  });

  it("Should emit WeatherRequested event on successful request", async function () {
    const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
    
    const oracleAddress = await oracle.getAddress();
    await linkToken.transfer(oracleAddress, ethers.parseEther("1"));
    
    await expect(oracle.requestWeather("London"))
      .to.emit(oracle, "WeatherRequested");
  });

  it("Should only allow owner to update configurations", async function () {
    const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
    
    const newJobId = ethers.encodeBytes32String("newJob");
    await expect(oracle.connect(addr1).setJobId(newJobId))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should store request information correctly", async function () {
    const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);
    
    const oracleAddress = await oracle.getAddress();
    await linkToken.transfer(oracleAddress, ethers.parseEther("1"));
    
    const tx = await oracle.requestWeather("Paris");
    const receipt = await tx.wait();
    
    // Find the WeatherRequested event
    const event = receipt.logs.find(log => {
      try {
        const parsed = oracle.interface.parseLog(log);
        return parsed && parsed.name === "WeatherRequested";
      } catch {
        return false;
      }
    });
    
    expect(event).to.not.be.undefined;
  });

  it("Should restrict setChainlinkOracle to owner only", async function () {
    const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
    await expect(oracle.connect(addr1).setChainlinkOracle(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should restrict setFee to owner only", async function () {
    const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
    await expect(oracle.connect(addr1).setFee(ethers.parseEther("0.2")))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should restrict withdrawLink to owner only", async function () {
    const { oracle, addr1 } = await loadFixture(deployWeatherOracleFixture);
    await expect(oracle.connect(addr1).withdrawLink())
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should allow owner to update jobId", async function () {
    const { oracle, owner } = await loadFixture(deployWeatherOracleFixture);
    const newJobId = ethers.encodeBytes32String("newJob");
    await expect(oracle.setJobId(newJobId)).to.not.be.reverted;
  });

  it("Should allow owner to update fee", async function () {
    const { oracle, owner } = await loadFixture(deployWeatherOracleFixture);
    await expect(oracle.setFee(ethers.parseEther("0.2"))).to.not.be.reverted;
  });

  it("Should emit WeatherRequested with correct city and requester", async function () {
    const { oracle, linkToken, owner } = await loadFixture(deployWeatherOracleFixture);

    const oracleAddress = await oracle.getAddress();
    await linkToken.transfer(oracleAddress, ethers.parseEther("1"));

    const tx = await oracle.requestWeather("Tokyo");
    const receipt = await tx.wait();

    const event = receipt.logs.find(log => {
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