const hre = require("hardhat");

async function main() {
  const LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK
  const ORACLE = "0x6090149791d654a61848D98596A87443Fae41992"; // Chainlink Operator
  const JOB_ID = hre.ethers.utils.toUtf8Bytes("ca98366cc3314ed5af205319349ad077");
  const FEE = hre.ethers.utils.parseEther("0.1");

  const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
  const oracle = await WeatherOracle.deploy(LINK_TOKEN, ORACLE, JOB_ID, FEE);

  await oracle.deployed();
  console.log("WeatherOracle deployed to:", oracle.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});