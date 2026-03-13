// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/operatorforwarder/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WeatherOracle
 * @notice Decentralized weather data oracle using Chainlink Any API
 * @dev Uses ChainlinkClient to fetch weather data from off-chain APIs via Chainlink nodes.
 *      The oracle emits events for all state changes, enabling The Graph subgraph indexing.
 *      Weather data parsing is done on-chain from a pipe-delimited string format
 *      (e.g., "2500|clear sky") returned by the Chainlink External Adapter.
 */
contract WeatherOracle is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    // ========================
    // Events
    // ========================
    event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester);
    event WeatherReported(
        bytes32 indexed requestId,
        string city,
        int256 temperature,
        string description,
        uint256 timestamp,
        address indexed requester
    );

    // ========================
    // State
    // ========================
    struct WeatherReport {
        string city;
        int256 temperature;     // Temperature in Celsius * 100 (e.g., 2050 = 20.50°C)
        string description;    // Weather description (e.g., "clear sky")
        uint256 timestamp;
    }

    mapping(bytes32 => WeatherReport) public weatherReports;
    mapping(bytes32 => address) public requestToRequester;
    mapping(bytes32 => string) public requestToCity;

    bytes32 private jobId;
    uint256 private fee;
    address private oracle;

    // ========================
    // Constructor
    // ========================
    /**
     * @notice Initializes the oracle with Chainlink configuration
     * @param _link Address of the LINK token on the deployed network
     * @param _oracle Address of the Chainlink oracle node
     * @param _jobId Job specification ID for the Chainlink request
     * @param _fee LINK payment amount per request (in wei, e.g., 0.1 LINK = 1e17)
     */
    constructor(
        address _link,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) Ownable() {
        require(_link != address(0), "Invalid LINK address");
        require(_oracle != address(0), "Invalid oracle address");

        _setChainlinkToken(_link);
        _setChainlinkOracle(_oracle);
        oracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    // ========================
    // Core Functions
    // ========================

    /**
     * @notice Requests weather data for a given city via Chainlink Any API
     * @dev Requires the contract to hold sufficient LINK tokens to pay the oracle fee.
     *      The actual weather API call is handled by the Chainlink External Adapter,
     *      which should be configured with the weather API key (never hardcode API keys in contracts).
     * @param _city The name of the city to fetch weather data for
     * @return requestId The unique ID for this Chainlink request
     */
    function requestWeather(string memory _city) public payable returns (bytes32 requestId) {
        require(bytes(_city).length > 0, "City cannot be empty");
        require(
            LinkTokenInterface(_chainlinkTokenAddress()).balanceOf(address(this)) >= fee,
            "Insufficient LINK"
        );

        Chainlink.Request memory req = _buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );

        // The Chainlink External Adapter handles API key management and data formatting.
        // The adapter is configured to:
        //   1. Call the weather API (e.g., OpenWeatherMap) with the city parameter
        //   2. Parse the JSON response
        //   3. Return a pipe-delimited string: "temperature|description"
        //      (temperature as int * 100, e.g., 2050 for 20.50°C)
        req._add("city", _city);

        requestId = _sendChainlinkRequest(req, fee);
        requestToRequester[requestId] = msg.sender;
        requestToCity[requestId] = _city;

        emit WeatherRequested(requestId, _city, msg.sender);
    }

    /**
     * @notice Callback function invoked by the Chainlink oracle with weather data
     * @dev Only callable by the Chainlink oracle (enforced by recordChainlinkFulfillment).
     *      Parses the pipe-delimited _weatherData string ("temperature|description")
     *      and stores the result on-chain.
     * @param _requestId The request ID being fulfilled
     * @param _weatherData Pipe-delimited weather data string (e.g., "2050|clear sky")
     */
    function fulfill(
        bytes32 _requestId,
        string memory _weatherData
    ) public recordChainlinkFulfillment(_requestId) {
        string memory city = requestToCity[_requestId];
        address requester = requestToRequester[_requestId];

        // Parse the pipe-delimited weather data: "temperature|description"
        (int256 temperature, string memory description) = _parseWeatherData(_weatherData);

        weatherReports[_requestId] = WeatherReport({
            city: city,
            temperature: temperature,
            description: description,
            timestamp: block.timestamp
        });

        emit WeatherReported(_requestId, city, temperature, description, block.timestamp, requester);
    }

    // ========================
    // Internal Helpers
    // ========================

    /**
     * @notice Parses a pipe-delimited weather data string into temperature and description
     * @dev Expected format: "temperature|description" where temperature is an integer
     *      representing Celsius * 100 (e.g., "2050|clear sky" means 20.50°C, clear sky).
     *      If parsing fails or format is invalid, returns defaults (0, "unknown").
     * @param _data The raw pipe-delimited string from the Chainlink oracle
     * @return temperature The parsed temperature value (Celsius * 100)
     * @return description The parsed weather description string
     */
    function _parseWeatherData(string memory _data)
        internal
        pure
        returns (int256 temperature, string memory description)
    {
        bytes memory dataBytes = bytes(_data);
        uint256 len = dataBytes.length;

        if (len == 0) {
            return (0, "unknown");
        }

        // Find the pipe delimiter position
        uint256 pipeIndex = len; // default: not found
        for (uint256 i = 0; i < len; i++) {
            if (dataBytes[i] == "|") {
                pipeIndex = i;
                break;
            }
        }

        // If no pipe found, treat entire string as description with 0 temperature
        if (pipeIndex == len) {
            return (0, _data);
        }

        // Parse temperature from the left side of the pipe
        temperature = _parseInt(dataBytes, 0, pipeIndex);

        // Extract description from the right side of the pipe
        uint256 descStart = pipeIndex + 1;
        uint256 descLen = len - descStart;

        if (descLen == 0) {
            description = "unknown";
        } else {
            bytes memory descBytes = new bytes(descLen);
            for (uint256 i = 0; i < descLen; i++) {
                descBytes[i] = dataBytes[descStart + i];
            }
            description = string(descBytes);
        }
    }

    /**
     * @notice Parses a substring of bytes into a signed integer
     * @dev Handles optional leading '-' for negative temperatures.
     *      Non-numeric characters are ignored after valid digits.
     * @param _data The byte array to parse from
     * @param _start Start index (inclusive)
     * @param _end End index (exclusive)
     * @return result The parsed signed integer value
     */
    function _parseInt(bytes memory _data, uint256 _start, uint256 _end)
        internal
        pure
        returns (int256 result)
    {
        bool negative = false;
        uint256 i = _start;

        if (i < _end && _data[i] == "-") {
            negative = true;
            i++;
        }

        uint256 absValue = 0;
        for (; i < _end; i++) {
            uint8 c = uint8(_data[i]);
            if (c >= 48 && c <= 57) { // '0' to '9'
                absValue = absValue * 10 + (c - 48);
            }
        }

        result = negative ? -int256(absValue) : int256(absValue);
    }

    // ========================
    // Admin Functions
    // ========================

    /**
     * @notice Updates the Chainlink oracle address
     * @param _oracle New oracle address
     */
    function setChainlinkOracle(address _oracle) public onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        oracle = _oracle;
        _setChainlinkOracle(_oracle);
    }

    /**
     * @notice Updates the Chainlink job specification ID
     * @param _jobId New job ID
     */
    function setJobId(bytes32 _jobId) public onlyOwner {
        jobId = _jobId;
    }

    /**
     * @notice Updates the LINK fee per request
     * @param _fee New fee amount in LINK wei
     */
    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
    }

    /**
     * @notice Withdraws all LINK tokens from the contract to the owner
     * @dev Emergency function to recover LINK tokens
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(_chainlinkTokenAddress());
        uint256 balance = link.balanceOf(address(this));
        require(balance > 0, "No LINK to withdraw");
        require(link.transfer(msg.sender, balance), "Unable to transfer LINK");
    }

    /**
     * @notice Returns the current fee per request
     */
    function getFee() public view returns (uint256) {
        return fee;
    }

    /**
     * @notice Returns the current oracle address
     */
    function getOracle() public view returns (address) {
        return oracle;
    }

    // Fallback function to receive ETH (for gas payments)
    receive() external payable {}
}