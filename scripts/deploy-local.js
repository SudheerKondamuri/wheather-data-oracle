const hre = require("hardhat");
require("dotenv").config();

async function main() {
    const accounts = await hre.ethers.getSigners();
    const owner = accounts[0];

    console.log("Deploying contracts with the account:", owner.address);

    // Deploy Mock LINK Token
    const MockLinkToken = await hre.ethers.getContractFactory("MockLinkToken");
    const linkToken = await MockLinkToken.deploy();
    await linkToken.waitForDeployment();
    const linkAddress = await linkToken.getAddress();
    console.log("MockLinkToken deployed to:", linkAddress);

    // Mock Oracle configuration
    const oracleAddress = owner.address; // Use owner as the mock oracle
    const jobId = hre.ethers.encodeBytes32String("mockJobId");
    const fee = hre.ethers.parseEther("0.1");

    console.log("Deploying WeatherOracle with parameters:");
    console.log("LINK Token:", linkAddress);
    console.log("Oracle:", oracleAddress);
    console.log("Job ID:", "mockJobId");
    console.log("Fee:", fee.toString());

    const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
    const oracle = await WeatherOracle.deploy(linkAddress, oracleAddress, jobId, fee);
    await oracle.waitForDeployment();

    const address = await oracle.getAddress();
    console.log("WeatherOracle deployed to:", address);

    // Fund the oracle with Mock LINK so it can make requests
    console.log("Funding WeatherOracle with 100 LINK...");
    await linkToken.transfer(address, hre.ethers.parseEther("100"));
    console.log("Funded.");

    console.log("\nDeployment completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
