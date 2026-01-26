const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const LINK_TOKEN = process.env.LINK_TOKEN_ADDRESS || "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  const ORACLE = process.env.ORACLE_ADDRESS || "0x6090149791d654a61848D98596A87443Fae41992";
  const JOB_ID = process.env.JOB_ID || "ca98366cc3314ed5af205319349ad077";
  const FEE = process.env.FEE || hre.ethers.parseEther("0.1");

  console.log("Deploying WeatherOracle with parameters:");
  console.log("LINK Token:", LINK_TOKEN);
  console.log("Oracle:", ORACLE);
  console.log("Job ID:", JOB_ID);
  console.log("Fee:", FEE.toString());

  const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
  const jobIdBytes32 = hre.ethers.encodeBytes32String(JOB_ID);
  const oracle = await WeatherOracle.deploy(LINK_TOKEN, ORACLE, jobIdBytes32, FEE);

  await oracle.waitForDeployment();
  
  const address = await oracle.getAddress();
  console.log("WeatherOracle deployed to:", address);
  console.log("\nIMPORTANT: Fund this contract with LINK tokens to make requests!");
  console.log("Update your .env and frontend with this address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});