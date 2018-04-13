/**
 * 1 - Login to the page "https://mabanque.bnpparibas/sitedemo/ident.html"
 * 2 - Get the information of all the acounts of the logged in user
 * 
 * Display data in JSON of all the:
 * {
 * "account": [
 *  {
 *      "accountName": accountName,
 *      "accountNumber": accountNumber,
 *      "actualAmount": actualAmount,
 *      "comingAmount": comingAmount
 *  },
 *  {
 *      ........
 *  },
 *  ........
 * ],
 * "name" : userName
 * }
 */

var page = require("webpage").create(),
    args = require('system').args,
    url = "https://mabanque.bnpparibas/sitedemo/ident.html";

const LOGIN_WAITING_TIME = 5000; // Time (ms) to wait after logging in 
// Set up the inputs
function showHelp() {
    console.log("\nUsage: ");
    console.log("\t phantomjs " + args[0] + " <user_number> <user_password>");
}
/**
 * Verify the input arguments
 * - must have exactly 3 arguments with user_number and user_password
 * - user_number must be a number
 * - user_password must be a number and contains exactly 6 characters
 */
function checkArguments() {
    // Check number of input arguments
    if (args.length !== 3) {
        console.log("[ERROR] Invalid input arguments!");
        return false;
    }

    // Check the user_number data type
    if (isNaN(args[1])){
        console.log("[ERROR] user_number '" + args[1] + "' is invalid! \n\tuser_number must be a numbers");
        return false;
    }

    // Check the user_password length and data type
    if (args[2].length !== 6 || isNaN(args[2])) {
      console.log("[ERROR] user_password: '" + args[2] + "' is invalid! \n\tuser_password must be a number and contains exactly 6 characters");
      return false;
    }
    
    return true;
}

var inputUNumber = args[1],
    inputUPassword = args[2];

if (!checkArguments()){
    showHelp();
    phantom.exit();
}

console.log("\nGetting all information for user_number: " + inputUNumber + "\n");

// Open the page
page.open(url, function (status) {
    if (status !== "success") {
        console.log("[ERROR] Failed to load the page! Please try again!");
        phantom.exit();
    } else {
        
        // Log in to the system
        var isLoggedIn = page.evaluate(login, inputUNumber, inputUPassword);
        
        if (isLoggedIn) {
            
            // Waiting sometime to redirect to the user's page
            setTimeout(function() {
                // Add some global functions
                page.evaluate(utilFunctions);

                // Get all accounts information from user's page
                var user_accounts = page.evaluate(getAllAccounts);

                if (user_accounts === null) {
                    console.log("Cannot get user's information! Please try again!");
                } else {
                    // Print return data in JSON format
                    console.log("\n\n--------------JSON DATA-----------------");
                    console.log(JSON.stringify(user_accounts, null, 2));
                }
                
                phantom.exit();

            }, LOGIN_WAITING_TIME);
        } else {
            console.log("[ERROR] Failed to log in! Please try again!");
            phantom.exit();
        }
    }
});

/**
 * ----------------------------------------------------------------------------
 * -----------------EVALUATE FUNCTIONS-----------------------------------------
 * ----------------------------------------------------------------------------
 */
/**
 * Get all accounts information from the user page
 * - Get innerDoc - content Document of iframe which contains all user's accounts. All of the parsing data will be done on this innerDoc
 * - Extract userName from innerDoc
 * - Extract information of all user's accounts
 */
function getAllAccounts() {
    console.log("[DEBUG] Get details of ALL accounts:");
    var allAccounts = [],
        userName = "UN_SET";

    var innerDoc = getIFrameInnerDoc("#main-iframe");
    if (innerDoc) {
        // Extract user's name
        userName = getUserName(innerDoc);
        
        var listAccount = []; // List of account DOMElements - each account DOMElement presents for one account of current user
        // Get all the group of accounts DOMElements by class name '.list-vue1' 
        var listViews = innerDoc.querySelectorAll(".list-vue1");

        // From each group of accounts DOMElement, get all the accounts DOMElements
        for (i = 0; i < listViews.length; i++) {
            var nodeList = listViews[i].querySelectorAll(".list-vue1 > li");
            for (j = 0; j < nodeList.length; j++) {
                // data-key must not be NULL
                if (nodeList[j].getAttribute("data-key") !== null) {
                    // Add the current account DOMELement to the list
                    listAccount.push(nodeList[j].querySelector(".compte-favori"));
                }
            }
        }
        // console.log("[DEBUG] Nb of account: " + listAccount.length);

        // For each account DOMElement, extract its information
        for (i = 0; i < listAccount.length; i++) {
            console.log("\n[DEBUG] ---------- Account Details ----------------");
            var currentAccountData = getDetailsEachAccount(listAccount[i]);
            if (currentAccountData) {
                // Add the current account data to the list
                allAccounts.push(currentAccountData);
            }
        }
    } else {
        console.log("[ERROR] Cannot find innerDoc.");
    }

    // Check if we have some data to return
    if (userName === 'UN_SET' && allAccounts.length === 0){
        return null;
    }
    // Return the data of the current user in JSON format
    return {
        name: userName,
        accounts: allAccounts
    };

}

/**
 * LOGIN STEPS:
 * on the page: https://mabanque.bnpparibas/sitedemo/ident.html
 * 1 - populate 'Mon numéro client'
 * 2 - populate 'Mon code secret'
 * 3 - click the button 'Accéder à mes comptes': id=submitIdent
 * @returns true: if we can found the loggin form, fill the form and click on the button to login
 *          false : otherwise
 */
function login(uNumero, uCode) {
    console.log( "[DEBUG] Populate the login form with Client's Number: " + uNumero + " and Code: " + uCode );
    var client_nbr_dom = document.querySelector("#client-nbr");
    var secret_nbr_dom = document.querySelector("#secret-nbr");
    var submitIdent_dom = document.querySelector("#submitIdent");

    if (client_nbr_dom && secret_nbr_dom && submitIdent_dom) {
        // Set value for the client number: equals to the first parameter
        client_nbr_dom.value = uNumero;
        // Set value for the client password: equals to the second parameter
        if ( !setHiddenPassword(uCode) ){
            return false;
        }
        // Click the button to login
        submitIdent_dom.click();
        return true;
    } else {
        console.log("[ERROR] Invalid log in form! Please try again!");
        return false;
    }
    
    /**
     *  Manipulate typing password like a user.
     */
    function setHiddenPassword(str) {
        console.log("[DEBUG] Manipulate typing password like a user.");
        var list_a_dom_in_password = document.querySelectorAll( "#secret-nbr-keyboard > .password-key");
        // Verify that we have found the password key list
        if (!list_a_dom_in_password) {
            console.log("[ERROR] Cannot find any password key");
            return false;
        }

        for (i = 0; i < str.length; i++) {
            var password_key_clicked = false;
            for (j = 0; j < list_a_dom_in_password.length; j++) {
                if (str[i] === list_a_dom_in_password[j].getAttribute("data-value")) {
                    list_a_dom_in_password[j].click();
                    password_key_clicked = true;
                    break;
                }
            }
            // Verify that we have clicked on a password key
            if (password_key_clicked === false) {
                console.log("[ERROR] Cannot find the password key: " + str[i]);
                return false;
            }
        }

        return true;
    }
}
/**
 * ---------------------END EVALUATE FUNCTION--------------------------
 */


///////////////////////////////////////////////////////////////////////////////
/**
 * ----------------------------------------------------------------------------
 * -----------------UTIL FUNCTIONS FOR EVALUATE--------------------------------
 * ----------------------------------------------------------------------------
 */
function utilFunctions() {
    /**
     *  Get details of each Account:
     * - the account name
     * - the account number
     * - the actual amount of the account
     * - the coming amount to the account
     */
    window.getDetailsEachAccount = function (account) {
        var accountName = "UN_SET",
            accountNumber = "UN_SET",
            actualAmount = "UN_SET",
            comingAmount = "0 €";

        if (account) {
            // Get infos from the div 'infos-compte-fix'
            var infos_compte_fix_dom = account.querySelector(".infos-compte-fix");
            if (infos_compte_fix_dom) {
                //Get the Account name
                var accountName_dom = infos_compte_fix_dom.querySelector(".pointer");
                if (accountName_dom) {
                    accountName = accountName_dom.innerText;
                    console.log("[DEBUG] Account: " + accountName);
                } else {
                    console.log("[ERROR] Cannot find accountName");
                }

                // Get account number
                var accountNumber_dom = infos_compte_fix_dom.querySelector("span.icon")
                    .nextSibling;
                if (accountNumber_dom) {
                    accountNumber = accountNumber_dom.wholeText.trim();
                    console.log("[DEBUG] Account number: " + accountNumber);
                } else {
                    console.log("[ERROR] Cannot find accountNumber");
                }
            }

            // Get infos from the div 'infos-solde'
            var infos_solde_dom = account.querySelector(".infos-solde");
            if (infos_solde_dom) {
                // Get the actual amount
                var actualAmount_dom = infos_solde_dom.querySelector(".udc-solde");
                if (actualAmount_dom) {
                    actualAmount = actualAmount_dom.innerHTML.trim();
                    console.log("[DEBUG] Actual Amount: " + actualAmount);
                } else {
                    console.log("[ERROR] Cannot find actualAmount");
                }

                // Get the coming amount
                var comingAmount_dom = infos_solde_dom.querySelector(".a-venir strong");
                if (comingAmount_dom) {
                    comingAmount = comingAmount_dom.innerText.trim();
                    console.log("[DEBUG] Coming Amount: " + comingAmount);
                } else {
                    console.log("[ERROR] Cannot find comingAmount");
                }
            }
        }

        // Check if we have some data to return
        if ( accountName === accountNumber === actualAmount === "UN_SET" && comingAmount === "0 €"){
            console.log("Cannot get information of current account!");
            return null;
        }

        // Return data in JSON format
        return {
            accountName: accountName,
            accountNumber: accountNumber,
            actualAmount: actualAmount,
            comingAmount: comingAmount
        };
    };

    /**
     *  Get the inner document of an iframe with given iframe id
     */
    window.getIFrameInnerDoc = function (frameId) {
        //   console.log("[DEBUG] Get the iframe and its inner document");
        var ifr = document.querySelector(frameId);
        if (ifr) {
            var innerDoc = ifr.contentDocument || ifr.contentWindow.document;
            if (innerDoc) {
                return innerDoc;
            }
        }
        return null;
    };

    /**
     *  Get the user name from a innerDoc
     */
    window.getUserName = function (innerDoc) {
        var userName_dom = innerDoc.querySelector(".libelle-compte > h2.no-mob");
        if (userName_dom) {
            var userName = userName_dom.innerHTML.split(". ")[1];
            console.log("[DEBUG] User name: " + userName);
            return userName;
        } else {
            console.log("[ERROR] Cannot find user name.");
            return null;
        }
    };
}
/**
 * ---------------------END UTIL FUNCTIONS FOR EVALUATE--------------------------
 */


/////////////////////////////////////////////////////////////////////////////
/**
 * --------------------------------------------------------------------------
 * ---------------------PHANTOM HANDLERS-------------------------------------
 * --------------------------------------------------------------------------
 */
page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.onLoadStarted = function () {
    console.log("[DEBUG] Start loading page...");
};

page.onLoadFinished = function () {
    console.log("[DEBUG] Finished Loading!");
};

page.onResourceError = function(resourceError) {
    console.log("[ERROR] resourceError: " + JSON.stringify(resourceError));
};
/**
 * --------------------- END PHANTOM HANDLERS-------------------------------------
 */