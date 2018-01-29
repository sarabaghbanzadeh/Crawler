	<?php

	$startTime = microtime(true);

	// URL for our testcases
	$URLS = array(  "http://www.mcspotlight.org/index.shtml",	//0 : mcspotlight
			"http://www.instanet.com/"							//1 : instanet
		     );

	// Counts the number of times we start Crawling new seed URL.
	$counterSeedURLs = 0;

	// Removes existing Logs from previous execution.
	shell_exec('rm logs/*');
	shell_exec('rm SCREENSHOTS/*');
	if (file_exists("identicalURLs"))
		unlink('identicalURLs');
	if (file_exists("seedURLs"))
		unlink('seedURLs');
	if (file_exists("numOfActions"))
		unlink('numOfActions');
	if (file_exists("visitedURLs"))
		unlink('visitedURLs');
	if (file_exists("crawledURLs"))
		unlink('crawledURLs');
	if (file_exists("linksOfScreenShotsInOrder"))
		unlink('linksOfScreenShotsInOrder');
	if (file_exists("pdfLinks"))
		unlink('pdfLinks');
	if (file_exists("stopCrawling"))
		unlink('stopCrawling');
	if (file_exists("finalResult"))
		unlink('finalResult');


	// Execute the firt URL.
	shell_exec("phantomjs  --ssl-protocol=tlsv1 --ignore-ssl-errors=yes nonAJAXCrawler.js " .  $URLS[$argv[1]] . " 1>&2;");

	// Execute 'listIdenticalURLs.php' file to sort our first series of log.
	shell_exec("php listIdenticalURLs.php 1>&2;");

	file_put_contents('stopCrawling', "first step has been done");

	while(!file_exists("stopCrawling"))
	{
		$allURLs = glob("seedURLs");
		$content = file_get_contents($allURLs[0]);
		$allSeeds = explode("\n", $content);

		if (count($allSeeds) > 0 && $counterSeedURLs < count($allSeeds))
			shell_exec("phantomjs  --ssl-protocol=tlsv1 --ignore-ssl-errors=yes nonAJAXCrawler.js " .  $allSeeds[$counterSeedURLs] . " 1>&2;");

		else
			file_put_contents('stopCrawling', "DONE");

		$counterSeedURLs ++;
	}

	// Execute 'listIdenticalURLs.php' file to sort our first series of log.
	shell_exec("php listIdenticalURLs.php 1>&2;");

	$totalTime = microtime(true) - $startTime;

	echo "Time of Execution : $totalTime \n";
	echo "Number of seed URLs which have been Crawled : $counterSeedURLs \n";

	?>
