const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WeatherOracle", function () {
  let WeatherOracle, oracle, owner, addr1;
  let linkToken, mockOracle;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy Mock LINK and Oracle for testing
    const LinkMock = await ethers.getContractFactory("LinkToken"); // Ensure you have a LinkToken artifact
    linkToken = await LinkMock.deploy();
    
    const WeatherOracleFactory = await ethers.getContractFactory("WeatherOracle");
    // Mock addresses for constructor
    oracle = await WeatherOracleFactory.deploy(
      linkToken.address, 
      owner.address, 
      ethers.utils.formatBytes32String("jobId"), 
      ethers.utils.parseEther("0.1")
    );
  });

  it("Should fail if the contract has insufficient LINK", async function () {
    await expect(oracle.requestWeather("London")).to.be.revertedWith("Insufficient LINK");
  });

  it("Should emit WeatherRequested event on successful request", async function () {
    await linkToken.transfer(oracle.address, ethers.utils.parseEther("1"));
    await expect(oracle.requestWeather("London"))
      .to.emit(oracle, "WeatherRequested");
  });

  it("Should only allow owner to update configurations", async function () {
    const newJobId = ethers.utils.formatBytes32String("newJob");
    await expect(oracle.connect(addr1).setJobId(newJobId)).to.be.revertedWith("Ownable: caller is not the owner");
  });
});