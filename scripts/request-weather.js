const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("REACT_APP_CONTRACT_ADDRESS not set in .env");
  }

  const city = process.argv[2] || "London";

  console.log(`Requesting weather data for: ${city}`);
  console.log(`Contract address: ${contractAddress}`);

  const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
  const oracle = WeatherOracle.attach(contractAddress);

  // Check LINK balance
  const linkAddress = process.env.LINK_TOKEN_ADDRESS || "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  const linkAbi = ["function balanceOf(address) view returns (uint256)"];
  const linkToken = new hre.ethers.Contract(linkAddress, linkAbi, hre.ethers.provider);
  const linkBalance = await linkToken.balanceOf(contractAddress);
  console.log("Contract LINK balance:", hre.ethers.formatEther(linkBalance), "LINK");

  if (linkBalance === 0n) {
    throw new Error("Contract has no LINK tokens. Please fund the contract first.");
  }

  // Send the weather request
  const tx = await oracle.requestWeather(city);
  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Parse the WeatherRequested event
  const event = receipt.logs.find(log => {
    try {
      const parsed = oracle.interface.parseLog(log);
      return parsed && parsed.name === "WeatherRequested";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = oracle.interface.parseLog(event);
    console.log("\nWeather request submitted successfully!");
    console.log("Request ID:", parsed.args.requestId);
    console.log("City:", parsed.args.city);
    console.log("Requester:", parsed.args.requester);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
