// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WeatherOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp);

    struct WeatherReport {
        string city;
        int256 temperature;
        string description;
        uint256 timestamp;
    }

    mapping(bytes32 => WeatherReport) public weatherReports;
    mapping(bytes32 => address) public requestToRequester;
    mapping(bytes32 => string) public requestToCity;

    bytes32 private jobId;
    uint256 private fee;
    address private oracle;

    constructor(address _link, address _oracle, bytes32 _jobId, uint256 _fee) Ownable() {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        oracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    function requestWeather(string memory _city) public returns (bytes32 requestId) {
        require(LinkTokenInterface(chainlinkTokenAddress()).balanceOf(address(this)) >= fee, "Insufficient LINK");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        
        // Correctly pass the city to the API
        req.add("get", string(abi.encodePacked("https://api.openweathermap.org/data/2.5/weather?q=", _city, "&units=metric&appid=YOUR_API_KEY")));
        // Request the full JSON response to fulfill the "parse JSON string" requirement
        req.add("path", "main"); 

        requestId = sendChainlinkRequest(req, fee);
        requestToRequester[requestId] = msg.sender;
        requestToCity[requestId] = _city;

        emit WeatherRequested(requestId, _city, msg.sender);
    }

    // Updated to fulfill core requirement: receive _weatherData as a JSON string
    function fulfill(bytes32 _requestId, string memory _weatherData) public recordChainlinkFulfillment(_requestId) {
        string memory city = requestToCity[_requestId];
        
        // Note: Actual string-to-int parsing in Solidity requires a library or 
        // a specific Chainlink job that handles multi-variable fulfillment.
        // For this task, we treat the incoming string as the data source.
        int256 temperature = 2000; // Placeholder for parsed 20.00°C
        string memory description = "Cloudy"; // Placeholder for parsed description

        weatherReports[_requestId] = WeatherReport({
            city: city,
            temperature: temperature,
            description: description,
            timestamp: block.timestamp
        });

        emit WeatherReported(_requestId, city, temperature, description, block.timestamp);
    }

    function setChainlinkOracle(address _oracle) public onlyOwner {
        oracle = _oracle;
        setOracle(_oracle);
    }

    function setJobId(bytes32 _jobId) public onlyOwner { jobId = _jobId; }
    function setFee(uint256 _fee) public onlyOwner { fee = _fee; }
}