<?php

class HandleLogs
{
	private $URLs = array();
	private $seedURLs = array();
	private $allIdenticalURLs = array();

	/**
	 * C'tor
	 */
	function HandleLogs()
	{
		$this->extractIdenticalURLs();
		$this->extractSeedURLs();
	}


	// Removes repeated lines from 'identicalURLs' file.
	private function extractIdenticalURLs() 
	{
		if (file_exists("identicalURLs"))
		{
			$allExistingURLs = glob("identicalURLs");
			$temp = file_get_contents($allExistingURLs[0]);
			$allLines = explode("\n", $temp);

			// Removes repeated lines from 'identicalURLs' file.
			for ($i=0; $i<count($allLines); $i++)
			{
				if (!in_array($allLines[$i], $this->URLs))
					array_push($this->URLs, $allLines[$i]);
			}

			$finalIdenticalURLs = implode("\n", $this->URLs);

			unlink('identicalURLs');
			file_put_contents('identicalURLs', $finalIdenticalURLs, FILE_APPEND);
		}
	}


	// Removes repeated lines from 'seedURLs' file.
	private function extractSeedURLs() 
	{
		if (file_exists("seedURLs"))
		{
			$allURLs = glob("seedURLs");
			$content = file_get_contents($allURLs[0]);
			$allSeeds = explode("\n", $content);

			// Removes repeated lines from 'seedURLs' file.
			for ($i=0; $i<count($allSeeds); $i++)
			{
				if (!in_array($allSeeds[$i], $this->seedURLs))
					array_push($this->seedURLs, $allSeeds[$i]);
			}

			$finalURLs = implode("\n", $this->seedURLs);

			unlink('seedURLs');
			file_put_contents('seedURLs', $finalURLs, FILE_APPEND);
		}
	}
}

$handleLogs = new HandleLogs();

?>
