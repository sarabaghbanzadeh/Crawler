var fs = require('fs');

phantom.injectJs("functions/GetLinksOnPage.js");
phantom.injectJs("functions/MD5Creator.js");
phantom.injectJs("functions/XMLWriter.js");

var site = phantom.args[0];
var page = require('webpage').create();

page.viewportSize = { width: 1920, height: 1080 };

// To control the behaviour of the Crawler.
// Determines the number of clicks PhantomJS needs to perform start from given URL.
var recursionDepth = 3;
var counterDepth = 0;
var recursionDepthReached = false;
var noneClickablePage = false;

var numOfActions = 0;

var curURL;
var allLinks = new Array();

// To handle redirecting URLs (TODO: use onResourceReceived calback (in AJAX version) to check the value of the 'Location' header)
var URLToBeLoaded = site;


// Determines all the crawled URLs.
var crawledURLs = new Array();

/** Keeps all the URLs which still needs to be Crawled. Each index has the following specifications,
 *  	1. The "href" of the current page.
 *  	2. An array contains all the out-going Links, on which PhantomJS has not clicked yet, from the URL.
 */ 
var noneCrawledURLs = new Array();
// The structure is the same with "noneCrawledURLs". The difference is that nothing would be deleted from this array.
var allTheLinksToBeReported = new Array();

// Keeps the list of all clicked URL in the order so that the Crawler can determine to which step it needs to return in order to continue Crawling website.
var allURLsInOrder = [site];
// Keeps all the visited URLs.
var allVisitedURLs = new Array();

var countcount = 0;

// PhantomJS starts loading the URL
page.open(site);


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// CALLBACK FUNCTIONS //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

/**
 * Happens when PhantomJS finishes loading the URL.
 * ------ This callback won't be called through AJAX calls ------
 */
page.onLoadFinished = function(status) 
{
	countcount += 1;

	var timeToWait = getTheRandomTime();
	

	if (countcount == 1)
	{
		window.setTimeout(function () {


			if (status == 'fail')
			{
				createXMLFile();
				//phantom.exit();	
			}

			curURL = getURL();

			// Checks if the server wants to redirect the browser to another link.
			if (counterDepth < recursionDepth && curURL != URLToBeLoaded)
			{
				fs.write('identicalURLs', curURL + " |=| " + URLToBeLoaded + "\n", 'a');
				allURLsInOrder.pop();
				allURLsInOrder.push(curURL);
				// TODO
				UpdateMainArraysBasedOnNewURL();
			}
			else if (recursionDepthReached && curURL != URLToBeLoaded)
			{
				fs.write('identicalURLs', curURL + " |=| " + URLToBeLoaded + "\n", 'a');
				crawledURLs.push(curURL);
				// TODO
				UpdateMainArraysBasedOnNewURL();
			}

			if (!alreadyInProcess("") && !recursionDepthReached)
			{
				// Takes the screenshot of the current page
				page.render("SCREENSHOTS/page_" + numOfActions + ".png");
				fs.write('linksOfScreenShotsInOrder', numOfActions + "- " + curURL + "\n", 'a');
				numOfActions += 1;

				// URL is new. Then, extract all the links.
				findAllLinks(false);

				if (!noneClickablePage)
					// TODO
					crawler();
				else
				{
					// Dump current logs
					dumpLogs(curURL, null, null);

					if (allURLsInOrder.length > 0)
						loadURL(allURLsInOrder[allURLsInOrder.length - 1], true);
					else
					{
						createXMLFile();
						phantom.exit();	
					}
				}
			}
			else
			{
				if (recursionDepthReached)
				{
					// TODO: extract all the links to report them as the output. Just add them to second array not the main one
					findAllLinks(true);

					// Takes the screenshot of the curreny page
					page.render("SCREENSHOTS/page_" + numOfActions + ".png");
					fs.write('linksOfScreenShotsInOrder', numOfActions + "- " + curURL + "\n", 'a');
					numOfActions += 1

					var currentDOM = getDom();

					// Dumps all the outgoing URLs from current DOM.
					writeToFile(curURL, curURL + "\n");
					writeToFile(curURL, "{GNOWIT}--!!--{TIWONG}" + "\n");

					writeToFile(curURL, "Recursion Depth Has Been Reached" + "\n");
					writeToFile(curURL, "{GNOWIT}--!!--{TIWONG}" + "\n");
					writeToFile(curURL, currentDOM + "\n");

					recursionDepthReached = false;

					if (allURLsInOrder.length > 0)
						loadURL(allURLsInOrder[allURLsInOrder.length - 1], true);
					else
					{
						createXMLFile();
						phantom.exit();
					}
				}
				// We have seen the URL before.
				else
				{
					var arrayOfOutGoingLinks = getTheLinksFromCurrentURL(curURL);

					// This URL had been visited before.
					if (arrayOfOutGoingLinks != null && arrayOfOutGoingLinks.length > 0 && !alreadyInProcess(arrayOfOutGoingLinks[0]))
						readyForClick(arrayOfOutGoingLinks, curURL);

					// We have started Crawling this URL before.
					else if (arrayOfOutGoingLinks != null && arrayOfOutGoingLinks.length > 0)
					{
						arrayOfOutGoingLinks = deleteTheFirstIndex(arrayOfOutGoingLinks);

						updateTheArrayOfLinks(curURL, arrayOfOutGoingLinks);

						var step = false;

						// Checks if there is still something on current DOM to be Crawled.
						if (arrayOfOutGoingLinks.length == 0)
						{
							deleteTheIndex(curURL);
							crawledURLs.push(curURL);
							allURLsInOrder.pop();
							step= true;
						}

						if (allURLsInOrder.length > 0)
							loadURL(allURLsInOrder[allURLsInOrder.length - 1], step);
						else
						{
							createXMLFile();
							phantom.exit();
						}
					}

					// There is an URL in 'allURLsInOrder' which does not exist in 'noneCrawledURLs'. This should not happen!
					else
					{
						allURLsInOrder.pop();

						if (allURLsInOrder.length > 0)
							loadURL(allURLsInOrder[allURLsInOrder.length - 1], true);
						else
						{
							createXMLFile();
							phantom.exit();
						}
					}
				}
			}
		}, timeToWait);
	}
}



//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// MAIN PART OF CRAWLER ////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


/**
 * This function will be called after receiving all the responses. 
 */
function crawler() 
{
	// There are still links to be Crawled.
	if (noneCrawledURLs.length > 0 && allURLsInOrder.length > 0)
	{
		// Then, we need to update "noneCrawledURLs" after redirecting a particular URL.
		var urlOfInProcessDOM = allURLsInOrder[allURLsInOrder.length - 1];

		var arrayOfOutGoingLinks = new Array();

		// the array contains all the outgoing links of the 'urlOfInProcessDOM'
		arrayOfOutGoingLinks = getTheLinksFromCurrentURL(urlOfInProcessDOM);

		// This URL has not been visited yet.
		if (arrayOfOutGoingLinks != null && arrayOfOutGoingLinks.length > 0 && !alreadyInProcess(arrayOfOutGoingLinks[0]))
			readyForClick(arrayOfOutGoingLinks, urlOfInProcessDOM);
		
		// This URL has been visited before.
		else if (arrayOfOutGoingLinks != null && arrayOfOutGoingLinks.length > 0 && alreadyInProcess(arrayOfOutGoingLinks[0]))
		{
			arrayOfOutGoingLinks = deleteTheFirstIndex(arrayOfOutGoingLinks);

			// update the array of outgoing links for curURL
			updateTheArrayOfLinks(urlOfInProcessDOM, arrayOfOutGoingLinks);

			var step = false

			// Checks if there is still something for this URL to be Crawled.
			if (arrayOfOutGoingLinks.length == 0)
			{
				deleteTheIndex(urlOfInProcessDOM);
				crawledURLs.push(urlOfInProcessDOM);
				allURLsInOrder.pop();
				step= true;
			}

			if (allURLsInOrder.length > 0)
				loadURL(allURLsInOrder[allURLsInOrder.length - 1], step);
			else
			{
				createXMLFile();
				phantom.exit();
			}
		}

		// There is an URL in 'allURLsInOrder' which does not exist in 'noneCrawledURLs'. This should not happen!
		else
		{
			if (noneCrawledURLs.length == 0 || noneCrawledURLs == null || allURLsInOrder.length == 1)
			{
				dumpLogsPerStep();
				createXMLFile();
				phantom.exit();
			}
			else
			{
				allURLsInOrder.pop();

				if (allURLsInOrder.length > 0)
					loadURL(allURLsInOrder[allURLsInOrder.length - 1], true);
				else
				{
					createXMLFile();
					phantom.exit();
				}
			}
		}
	}
	else
	{
		createXMLFile();
		phantom.exit();
	}
}



//////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////// TO UPDATE DATA /////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

function readyForClick(arrayOfOutGoingLinks, url)
{
	var currentURLToBeClicked = arrayOfOutGoingLinks[0];

	arrayOfOutGoingLinks = deleteTheFirstIndex(arrayOfOutGoingLinks);

	// Makes sure that we have updated the array of all the links.
	updateTheArrayOfLinks(url, arrayOfOutGoingLinks);

	// Checks if there is still something on current DOM to be Crawled.
	if (arrayOfOutGoingLinks.length == 0)
	{
		deleteTheIndex(url);
		crawledURLs.push(url);
		allURLsInOrder.pop();
	}

	click(currentURLToBeClicked);
}



/**
 * Updates the value of the "href" inside both "noneCrawledURLs" and "allTheLinksToBeReported" when "redirection" occures.
 */
function UpdateMainArraysBasedOnNewURL()
{
	for (var i=0; i<noneCrawledURLs.length; i++)
	{
		if (noneCrawledURLs[i].URL.toString() == URLToBeLoaded.toString())
		{
			noneCrawledURLs[i].URL = curURL;
			break;
		}
	}

	for (var i=0; i<allTheLinksToBeReported.length; i++)
	{
		if (allTheLinksToBeReported[i].URL.toString() == URLToBeLoaded.toString())
		{
			allTheLinksToBeReported[i].URL = curURL;
			break;
		}
	}
}



/**
 * Deletes the first index of the array.
 * TODO: Check why .shift() does not work for removing the first index of this array. 
 */
function deleteTheFirstIndex(arrayOfOutGoingLinks)
{
	var temporaryArray = new Array();
	for (var i=1; i<arrayOfOutGoingLinks.length; i++)
			temporaryArray.push(arrayOfOutGoingLinks[i]);
	
	return temporaryArray;
	//temporaryArray = arrayOfOutGoingLinks.splice(0, 1);
	//return temporaryArray;
}


/**
 * Removes the URL from 'noneCrawledURLs' by finding the index. 
 */
function deleteTheIndex(url)
{
	var index = -1;
	for (var i=0; i<noneCrawledURLs.length; i++)
	{
		if (noneCrawledURLs[i].URL.toString() == url.toString())
			index = i;
	}

	if (index > -1)
		noneCrawledURLs.splice(index, 1);
}


/**
 * To update the outgoing links of the URL.  
 */
function updateTheArrayOfLinks(url, arrayOfOutGoingLinks)
{
	for (var i=0; i<noneCrawledURLs.length; i++)
	{
		if (noneCrawledURLs[i].URL.toString() == url.toString())
			noneCrawledURLs[i].LINKS = arrayOfOutGoingLinks;
	}
}


/**
 * To get list of all outgoing links for the given URL.  
 */
function getTheLinksFromCurrentURL(urlToSearchFor)
{
	for (var i=0; i<noneCrawledURLs.length; i++)
	{
		if (noneCrawledURLs[i].URL.toString() == urlToSearchFor.toString())
			return noneCrawledURLs[i].LINKS;
	}
	return null;
}



/**
 * Checks whether PhantomJS has visited current URL or not. Checks the string representation of the URL not the XPath.
 */
function alreadyInProcess(url)
{
	if (url.length < 1 || url == null)
		url = curURL;

	for (var i=0; i<allVisitedURLs.length; i++)
	{
		if (allVisitedURLs[i].toString() == url.toString())
			return true;
	}
	return false;
}



//////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////// DUMPING LOGS ///////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

/**
 * Dumps current logs.
 */
function dumpLogs(url, allLinks, PDFs)
{
	var givenURL = url;

	if (url.indexOf("http") > -1)
		url = MD5(url);

	// To distinguish different logs inside the file.
	var delimiter = '{GNOWIT}--!!--{TIWONG}';

	if (allLinks != null || PDFs != null)
	{
		if (!fs.exists('logs/' + url))
		{
			writeToFile(url, givenURL + "\n");

			if (PDFs != null && PDFs.length > 0)
			{
				writeToFile(url, delimiter + "\n");

				// Dumps all the outgoing URLs from current DOM.
				for (var i=0; i<PDFs.length; i++)
					writeToFile(url, PDFs[i] + "\n");
			}
			else
				writeToFile(url, delimiter + "\n");

			if (allLinks != null && allLinks.length > 0)
			{
				// Dumps all the outgoing URLs from current DOM.
				for (var i=0; i<allLinks.length; i++)
					writeToFile(url, allLinks[i] + "\n");
				writeToFile(url, delimiter + "\n");
			}

			// Dumps the DOM of current URL
			writeToFile(url, getDom() + "\n");
		}
	}
	else
	{
		if (!fs.exists('logs/' + url))
		{
			// Dumps all the outgoing URLs from current DOM.
			writeToFile(url, givenURL + "\n");
			writeToFile(url, delimiter + "\n");

			writeToFile(url, "There is no outgoing link" + "\n");
			writeToFile(url, delimiter + "\n");

			// Dumps the DOM of current URL
			writeToFile(url, getDom() + "\n");
		}
	}
}



/**
 * Checks whether the target file exists or not.
 */
function writeToFile(fileName, content)
{
	if (fileName.indexOf("http") > -1)
		fileName = MD5(fileName);

	if (!fs.exists('logs/' + fileName))
		fs.write('logs/' + fileName, content, 'w');
	else
		fs.write('logs/' + fileName, content, 'a');
}



/**
 * Write the final result, saved in 'allTheLinksToBeReported', into an XML file
 */
function createXMLFile()
{
	var currentURLToBeWritten, currentListOfOutGoingLinks = new Array(); 
	
	for (var i=0; i<allTheLinksToBeReported.length; i++)
	{
		currentURLToBeWritten = allTheLinksToBeReported[i].URL.toString();
		currentListOfOutGoingLinks = allTheLinksToBeReported[i].LINKS;
		fs.write('finalResult', 'mainPage @@' + currentURLToBeWritten + "\n", 'a');

		for (var j=0; j<currentListOfOutGoingLinks.length; j++)
			fs.write('finalResult', 'outGoingLinks @@' + currentListOfOutGoingLinks[j] + "\n", 'a');

		fs.write('finalResult', "\n", 'a');
	}
}



//////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////// IMPORTANT FUNCTIONS ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

/**
 * Finds all the existing links inside the current page and updates 'noneCrawledURLs.
 */
function findAllLinks(reachedRecursionDepth)
{
	page.injectJs("functions/GetLinksOnPage.js");

	var links = page.evaluate(function()
	{
		return findAllTheLinks();	
	});

	var linksToPDFs = page.evaluate(function()
	{
		return findAllPDFs();	
	});

	// TODO: remove
	if (linksToPDFs != null && linksToPDFs.length > 0)
	{
		for (var i=0; i<linksToPDFs.length; i++)
			fs.write('pdfLinks', linksToPDFs[i] + "\n", 'a');	
	}

	if (!reachedRecursionDepth)
	{
		// There are some links inside the current DOM.
		if ((links != null && links.length > 0) || (linksToPDFs != null && linksToPDFs.length > 0))
		{
			// Dump current logs
			dumpLogs(curURL, links, linksToPDFs);

			// Add the URL and all existing Links to the 'noneCrawledURLs' and 'allTheLinksToBeReported'
			if ((links != null && links.length > 0))
			{
				noneCrawledURLs.push({URL:curURL.toString(), LINKS:links});
				if (linksToPDFs != null && linksToPDFs.length > 0)
				{
					var allLinksInPage = new Array();
					allLinksInPage = links.concat(linksToPDFs);
					allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:allLinksInPage});
				}
				else
					allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:links});
			}
			else if (linksToPDFs != null && linksToPDFs.length > 0)
				allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:linksToPDFs});
		}
		else
		{
			// There is nothing to be Crawled.
			crawledURLs.push(curURL);

			allURLsInOrder.pop();
			allVisitedURLs.push(curURL);
			noneClickablePage = true;
		}
	}
	else
	{
		// There are some links inside the current DOM.
		if ((links != null && links.length > 0) || (linksToPDFs != null && linksToPDFs.length > 0))
		{
			// Add the URL and all existing Links to the 'allTheLinksToBeReported'
			if ((links != null && links.length > 0) && (linksToPDFs != null && linksToPDFs.length > 0))
			{
				var allLinksInPage = new Array();
				allLinksInPage = links.concat(linksToPDFs);
				allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:allLinksInPage});
			}
			else if (linksToPDFs != null && linksToPDFs.length > 0)
				allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:linksToPDFs});
			else
				allTheLinksToBeReported.push({URL:curURL.toString(), LINKS:links});
		}
	}
}


/**
 * Clicks on an element.
 */
function click(urlToBeClicked)
{
	URLToBeLoaded = urlToBeClicked;

	// We are in "click" function because we have found links on the current Page.
	allVisitedURLs.push(curURL);

	counterDepth += 1;
	
	// To make sure that the Crawler goes forward until reaches the 'recursionDepth'
	if (counterDepth < recursionDepth && urlToBeClicked != site)
		allURLsInOrder.push(urlToBeClicked);

	else if (counterDepth == recursionDepth)
	{
		// We don't lable this as the visited URL since we won't extract it's links. Then, if we visit the link later, we would want to Crawl it.

		// We have not Crawled the link yet. We just reached it.
		//crawledURLs.push(urlToBeClicked);
		recursionDepthReached = true;
	}

	// We want to change the current page and want to decide on its status later.	
	// TODO: this function won't be called if this flag is true
	//noneClickablePage = false;

	countcount = 0;
	page.open(urlToBeClicked);

}


/**
 * Returns to the URL which we have seen before.
 */
function loadURL(url, step)
{
	// TODO:
	if (step)
		counterDepth -= 1;

	URLToBeLoaded = url;

	countcount = 0;
	page.open(url);
}



//////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////// OTHER FUNCTIONS ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


/**
 * Returns a random number by which PhantomJS acts not as a robot in the website's point of view.
 */
function getTheRandomTime()
{
	var baseTime = 3000;
	var randomVal = Math.floor(Math.random() * (2000 - 1000) + 1000);
	return (baseTime + randomVal);
}

/**
 * Returns the string which represents the DOM of the current page.
 */
function getDom()
{
	return page.evaluate(function() 
	{
		return document.documentElement.innerHTML;
	});
}


/**
 * Returns the URL of the current page.
 */
function getURL()
{
	return page.evaluate(function()
	{
		return document.URL;	
	});
}


// Use for debugging purposes.
page.onConsoleMessage = function (msg)
{
	console.log(msg);    
}
