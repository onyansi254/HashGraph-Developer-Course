const {
    Client,
    PrivateKey,
    Hbar,
    FileCreateTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    ContractExecuteTransaction
} = require("@hashgraph/sdk");

require("dotenv").config();

async function environmentSetup() {
    // Grab your Hedera testnet account ID and Private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    // If we weren't able to grab it, throw an error
    if (!myAccountId || !myPrivateKey) {
        throw new Error(
            "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
        );
    }
    // Create your Hedera Testnet Client
    const client = Client.forTestnet();

    // Set your account as the client's operator
    client.setOperator(myAccountId, PrivateKey.fromString(myPrivateKey));




    //Store the Smart Contract Bytecode on Hedera
    //Import the compiled contract from the HelloHedera.json file
    let helloHedera = require("./HelloHedera.json");
    const bytecode = helloHedera.data.bytecode.object;

    //Create a file on Hedera and store the hex-encoded bytecode
    const fileCreateTx = new FileCreateTransaction()
            //Set the bytecode of the contract
            .setContents(bytecode);

    //Submit the file to the Hedera test network signing with the transaction fee payer key specified with the client
    const submitTx = await fileCreateTx.execute(client);

    //Get the receipt of the file create transaction
    const fileReceipt = await submitTx.getReceipt(client);

    //Get the file ID from the receipt
    const bytecodeFileId = fileReceipt.fileId;

    //Log the file ID
    console.log("The smart contract byte code file ID is " +bytecodeFileId)




    //Deploy a Hedera Smart Contract
    // Instantiate the contract instance
    const contractTx = await new ContractCreateTransaction()
        //Set the file ID of the Hedera file storing the bytecode
        .setBytecodeFileId(bytecodeFileId)
        //Set the gas to instantiate the contract
        .setGas(300000)
        //Provide the constructor parameters for the contract
        .setConstructorParameters(new ContractFunctionParameters().addString("Hello from Hedera!"));

    //Submit the transaction to the Hedera test network
    const contractResponse = await contractTx.execute(client);

    //Get the receipt of the file create transaction
    const contractReceipt = await contractResponse.getReceipt(client);

    //Get the smart contract ID
    const newContractId = contractReceipt.contractId;

    //Log the smart contract ID
    console.log("The smart contract ID is " + newContractId);

    //v2 JavaScript SDK



    //Call the get_message contract function
    // Calls a function of the smart contract
    const contractQuery = await new ContractCallQuery()
        //Set the gas for the query
        .setGas(300000)
        //Set the contract ID to return the request for
        .setContractId(newContractId)
        //Set the contract function to call
        .setFunction("get_message" )
        //Set the query payment for the node returning the request
        //This value must cover the cost of the request otherwise will fail
        .setQueryPayment(new Hbar(2));

    //Submit to a Hedera network
    const getMessage = await contractQuery.execute(client);

    // Get a string from the result at index 0
    const message = getMessage.getString(0);

    //Log the message
    console.log("The contract message: " + message);

    //v2 Hedera JavaScript SDK


    

    //Call the set_message contract function
     //Create the transaction to update the contract message
    const contractExecTx = await new ContractExecuteTransaction()
        //Set the ID of the contract
        .setContractId(newContractId)
        //Set the gas for the contract call
        .setGas(100000)
        //Set the contract function to call
        .setFunction("set_message", new ContractFunctionParameters().addString("Hello from Hedera again!"));

    //Submit the transaction to a Hedera network and store the response
    const submitExecTx = await contractExecTx.execute(client);

    //Get the receipt of the transaction
    const receipt2 = await submitExecTx.getReceipt(client);

    //Confirm the transaction was executed successfully 
    console.log("The transaction status is " +receipt2.status.toString());

    //Query the contract for the contract message
    const contractCallQuery = new ContractCallQuery()
        //Set the ID of the contract to query
        .setContractId(newContractId)
        //Set the gas to execute the contract call
        .setGas(100000)
        //Set the contract function to call
        .setFunction("get_message")
        //Set the query payment for the node returning the request
        //This value must cover the cost of the request otherwise will fail 
        .setQueryPayment(new Hbar(2));

    //Submit the transaction to a Hedera network 
    const contractUpdateResult = await contractCallQuery.execute(client);

    //Get the updated message at index 0
    const message2 = contractUpdateResult.getString(0);

    //Log the updated message to the console
    console.log("The updated contract message: " + message2);

//v2 Hedera JavaScript SDK

}
environmentSetup();