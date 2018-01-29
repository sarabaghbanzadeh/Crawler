/**
 * Finds all existing links on the current page.
 *   
 * @return: The array contains the "href" of all the links on the page. 
 */
function findAllTheLinks()
{
	// We want to crawl the website in its second-level domain.
	var domain = document.domain;
	var secondLevelDomain = getDomain(domain);

	var allClickables = getTheArrayOfClickables(secondLevelDomain); 
			
	return removeDuplicate(allClickables);
}



/**
 * Finds all existing links to the PDF files on the current page.
 */
function findAllPDFs()
{
	// We want to crawl the website in its second-level domain.
	var domain = document.domain;
	var secondLevelDomain = getDomain(domain);

	var allClickables = document.getElementsByTagName('a');
	var _finalLinksToPDFs = filterOutHrefs(allClickables, domain, domain, true);
			
	return removeDuplicate(_finalLinksToPDFs);
}



/**
 * Finds the second-level domain of the current HTML page.
 *
 * @param: String contains the domain of the current HTML page.
 * @return: String contains the second-level domain of the current HTML page.
 */
function getDomain(curDomain)
{
	var lastDot = curDomain.lastIndexOf(".");
	var secondLastDot = curDomain.lastIndexOf(".", lastDot - 1);
	return (curDomain.substring(secondLastDot + 1));
}



/**
 * Finds all the links on the current HTML page.
 *
 * @return: An array contains the "href" of all the links on the current page.
 */
function getTheArrayOfClickables(domain)
{
	// Keeps all the elements on the current HTML page.
	var _clickables = document.getElementsByTagName('a');

	_clickables = filterOutHrefs(_clickables, domain, domain, false);

	// Checks if there is "iframe" on the current HTML page. If there is any, add their clickables to the "_cickables"
	var _iframes = document.getElementsByTagName('iframe');

	for (var i=0; i<_iframes.length; i++)
	{
		var currentIframe = _iframes[i];
		var srcOfCurrentIframe = currentIframe.src;

		// We cannot get access to the content of all the "iframe"s due to the "same origin policy".
		if (srcOfCurrentIframe != null && checkSameOriginPolicy(srcOfCurrentIframe, domain))
		{
			var contentOfCurrentIframe = currentIframe.contentDocument;
			var htmlPartOfCurrentIframe = contentOfCurrentIframe.getElementsByTagName('html')[0];
			var allElementsOfCurrentIframe = htmlPartOfCurrentIframe.getElementsByTagName('a');
			_clickables = mergeArrays(_clickables, filterOutHrefs(allElementsOfCurrentIframe, domain, srcOfCurrentIframe, false));

			var iframesInsideCurrentIframe = htmlPartOfCurrentIframe.getElementsByTagName('iframe');
			_iframes = mergeArrays(_iframes, iframesInsideCurrentIframe);
		}
	}

	return _clickables;
}



/**
 * Checkes if the current 'iframe' is accessible.
 *
 * @param: The url of the current 'iframe'.
 * @param: The string which represents the domain of the current page.
 * @return: The boolean which tells whether or not the current 'iframe' is in the domain of the current page.
 */
function checkSameOriginPolicy(src, domain)
{
	if (src == null || src.length == 0)
		return true;
	else
	{
		var index = src.indexOf("/", src.indexOf("://") + 3);
		var url = src.substring(0, index);

		if (url.indexOf(domain) > -1)
			return true;
		else
			return false;
	}
}



/**
 * Concats two arrays in one array.
 *
 * @param: The main array.
 * @param: The array which should be merged with the main array.
 * @return: An array contains all the elements from two arrays.
 */
function mergeArrays(mainArr, secondArr)
{
	for (var i=0; i<secondArr.length; i++)
		mainArr.push(secondArr[i]);

	return mainArr;		
}



/**
 * Ignores elements in which we are not interested.
 *
 * @param: The array contains all the elements in which we are interested based on their tagName.
 * @param: The string which represents the second-level-domain of the website.
 * @param: The string which represents either the "src" of the "iframe" or the second-level-domain of the website.
 * @param: The string which determines whether we are looking for links to PDFs or not.
 * @return: An array contains all the elements in which we are interested based on the href attribute.
 */
function filterOutHrefs(arrOfElms, domain, src, PDF)
{
	var returnArr = new Array();
	var currentURL = document.URL;

	for (var i=0; i<arrOfElms.length; i++)   
	{
		var curElm = arrOfElms[i];
		var href = arrOfElms[i].href;
		var oneURL = false;

		if (curElm.nodeType == 1 && curElm.offsetParent !== null && href != null)
		{
			if (href.indexOf('http://www') > -1)
			{
				if (href.indexOf('http://') == href.lastIndexOf('http://'))
					oneURL = true;
			}
			else if (href.indexOf('https://www') > -1)
			{
				if (href.indexOf('https://') == href.lastIndexOf('https://'))
					oneURL = true;
			}

			if (oneURL && href != currentURL && (href.indexOf(domain) > -1 || href.indexOf(src) > -1) && !href.match( /#|\.js|\.css|\.svg|javascript/gi ))
			{
				if (!imageType(href) && !isInBlackList(href))
				{
					if (PDF && href.match( /\.pdf/gi ))
						returnArr.push(href);

					else if (!PDF && !href.match( /\.pdf/gi ))
						returnArr.push(href);
				}
			}
		}
	}

	return returnArr;
}



/**
 * Determines whether or not the href belong to an image.
 *
 * @param: The string which represents the href attribute of current element.
 * @return: The array which tells whether or not the given href belongs to an image.
 */
function imageType(href)
{
	return (href.match( /\.jpg|\.png|\.jpeg|\.jpe|\.jfif|\.gif|\.bmp|\.dib|\.tif|\.tiff/gi ));
}


/**
 * Checks possible duplicate..
 *
 * @param: The array contains the "href" of all the links on the current page.
 * @return: The array contains the unique "href" of all the links on the current page.
 */
function removeDuplicate(arr)
{
	var returnArr = new Array();
	var allTheURLs = "|";

	for (var i=0; i<arr.length; i++)
	{
		var currentHREF = arr[i];
		if (allTheURLs.indexOf("|" + currentHREF + "|") == -1)
		{
			returnArr.push(currentHREF);
			allTheURLs += (currentHREF + "|");
		}
	}

	return returnArr;
}



/**
 * Searches in black list of URLs.
 *
 * @param: The string which represents the href attribute of the current element.
 * @return: The boolean which tells whether or not this element should not be considered.
 */
function isInBlackList(href)
{
	// Put all the URLs with which we have problem to this array.
	var blackListOfURLs = [
				
				];

	for (var i=0; i<blackListOfURLs.length; i++)
	{
		if (blackListOfURLs[i] == href)
			return true;
	}
	return false;
}
