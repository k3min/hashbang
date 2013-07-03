<?php
	$db = new PDO('mysql:host=HOST;dbname=DATABASE', 'USER', 'PASSWORD');

	$collection = $db->prepare('SELECT id, title, type, showTitle FROM collections WHERE handle = ?');
	$blocks = $db->prepare('SELECT id, handle, title, description, content, type, time, attributes FROM blocks WHERE collectionId = ?');

	$collection->execute(array($_GET['handle']));

	if ($row = $collection->fetch(PDO::FETCH_OBJ)) {
		$response = array(
			'id' => 0 + $row->id,
			'handle' => $_GET['handle'],
			'title' => $row->title,
			'type' => $row->type,
			'showTitle' => $row->showTitle === 'true',
			'message' => 'Success'
		);

		$blocks->execute(array($row->id));

		while ($row = $blocks->fetch(PDO::FETCH_OBJ)) {
			$response['blocks'][$row->handle] = array(
				'id' => 0 + $row->id,
				'handle' => $row->handle,
				'title' => $row->title,
				'description' => $row->description,
				'content' => $row->content,
				'type' => $row->type,
				'time' => date('c', strtotime($row->time)),
				'attributes' => json_decode($row->attributes, true),
				'url' => sprintf('#!/%s/%s', $_GET['handle'], $row->handle)
			);
		}
	} else {
		header('HTTP/1.1 404 Not Found');
		$response['message'] = 'Not Found';
	}

	header('Cache-Control: no-cache');
	header('Content-Type: application/json');

	print json_encode($response);
?>