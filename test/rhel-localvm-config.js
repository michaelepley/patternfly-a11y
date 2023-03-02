function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

// attempts to escalate privileges in a cockpit session
async function escalatePrivs({page, data}) {
	var user = data[0];
	var pass = data[1];
	var text = await page.$$eval("#super-user-indicator", nodes => nodes.map(n => n.innerText));
	console.log("Super user indicator: " + text);
	// click the button to switch to administrative user
	if (text.join().includes("Limited")) {
		await page.click("#super-user-indicator");
		await page.waitForSelector("#switch-to-admin-access-password");
		// enter the password and authenticate
		await page.type("#switch-to-admin-access-password", pass);
		// await page.click("div:has(#switch-to-admin-access-password) > footer > button.pf-m-progress"); // apparently puppeteer does not yet support CSS level 4 selectors
		await page.click("button.pf-m-progress");
	    await page.waitForNavigation();
	    await delay(200);
	    console.assert(await page.waitForSelector("div#super-user-indicator"), "Not super user, tests may not succeed")
	    console.log("Super user indicator: " + await page.$$eval("#super-user-indicator", nodes => nodes.map(n => n.innerText)));
	    console.log("finished privilege escalation");
	} else console.log("already privileged user");
}

// Attempts to log into a RHEL cockpit web user interface
async function loginLocalVM_pwauth({ page, data }) {
	  const user = "mepley";
	  const pass = "password1!";
	  const url = data.prefix;
	  console.log(`nav to ${url}`);
	  // goto the page under test
	  await page.goto(`${url}`, { waitUntil: "load" });
	  // If we are presented a login page, attempt to login
	  if (page.$("#login")) {
		    console.log("have to auth first");
		    await page.waitForSelector("#login-button");
		    await page.type("#login-user-input", user);
		    await page.type("#login-password-input", pass);
		    await page.click("#login-button");
		    await page.waitForNavigation();
		    await delay(200);
		    console.log("finished auth");
		  }
	  var data = [user,pass];
	}

//Attempts to log out of a RHEL cockpit web user interface
async function logoutLocalVM_pwauth({ page, data }) {
	  const url = data.prefix;
	  console.log(`nav to ${url}`);
	  // goto the page under test
	  await page.goto(`${url}`, { waitUntil: "load" });
	  // If we are presented a login page, attempt to login
	  if (page.$("#login")) {
		    console.log("have to auth first");
		  }
	  var data = [user,pass];
	}

// Does not attempt to login to the RHEL cockpit web user interface 
async function nologin({ page, data }) {
    console.log("no authentication requested");
}

async function loginLocalVM_ssh({ page, data }) {
  const user = "mepley";
  const rsaid = "/home/" + user + ".ssh/" + user + "-localvm"
  const url = data.prefix;
// Client cert auth from   https://github.com/puppeteer/puppeteer/issues/1319
  const request = require('request');
  const fs = require('fs');
  (async () => {
      const browser = await puppeteer.launch();
      let page = await browser.newPage();

      // Enable Request Interception
      await page.setRequestInterception(true);

      // Client cert files
      const cert = fs.readFileSync(rsaid + ".pub");
      const key = fs.readFileSync(rsaid);

      page.on('request', interceptedRequest => {
          // Intercept Request, pull out request options, add in client cert
          const options = {
              uri: interceptedRequest.url(),
              method: interceptedRequest.method(),
              headers: interceptedRequest.headers(),
              body: interceptedRequest.postData(),
              cert: cert,
              key: key
          };

          // Fire off the request manually (example is using using 'request' lib)
          request(options, function(err, resp, body) {
              // Abort interceptedRequest on error
              if (err) {
                  console.error(`Unable to call ${options.uri}`, err);
                  return interceptedRequest.abort('connectionrefused');
              }

              // Return retrieved response to interceptedRequest
              interceptedRequest.respond({
                  status: resp.statusCode,
                  contentType: resp.headers['content-type'],
                  headers: resp.headers,
                  body: body
              });
          });

      });

      console.log(`nav to ${url}`);
      await page.goto(`${url}`, { waitUntil: "load" });
  })();
}

// these functions should be generally applicable for any PF based application
async function waitForOs(page) {
  // there should be no loading spinner
  await page.waitForSelector(".co-m-loader", {
    hidden: true,
  });

  // there should be no skeleton text
  await page.waitForSelector("[class*='skeleton']", {
    hidden: true,
    timeout: 60000,
  });
}

var auth_methods = [
	"none" : 
]

var urls_all= [
    "/system",
    "/system/logs",
    "/system/hwinfo",
    "/metrics",
    "/storage",
    "/network",
    "/podman",
    "/users",
    "/services",
    "/system/services#/?type=service",
    "/system/services#/?type=service",
    "/apps",
    "/sosreport",
    "/kdump",
    "/selinux/setroubleshoot",
    "/updates",
    "/subscriptions",
    "/system/terminal",
    "/apps",
  ];

var std_user_credential = { type : "none"} 
var std_user_credential_pw = { type : "password", value="password1!"} 
var std_user_credential_key = { type : "sshkey", value=""} 
	
var default_context = { authentication : {type : "none", user : "", credential : { type : "none"} } };
var context_std_user = { authentication : {type : "LocalVM_pwauth", user : "", credential : { type : "none"} } };
var context_root_user = { authentication : {type : "LocalVM_pwauth_escalate", user : "", credential : { type : "none"} } };
var urls_all_metadata = [
    { url : "/system" }, 
    { url : "/system" context : default_context }, 
    { url : "/system" context : context_std_user }, 
    { url : "/system" context : context_root_user }, 
  ];


const urls_test= urls_all.slice(0,2);

console.log("All URLS: " + urls_all);
console.log("Urls under test: " + urls_test);

module.exports = {
  prefix: "https://192.168.124.81:9090",
  auth: loginLocalVM_pwauth,
  waitFor: waitForOs,
  crawl: false,
  urls: urls_test,
};

