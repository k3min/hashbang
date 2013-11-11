<?php
	$db = new PDO('mysql:host=HOST;dbname=DATABASE', 'USER', 'PASSWORD', array(
		PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'
	));

	header('Cache-Control: no-cache');
	header('Content-Type: application/json');

	$collections = $db->prepare('SELECT * FROM collections WHERE handle = ?');
	$blocks = $db->prepare('SELECT * FROM blocks WHERE collectionId = ?');

	$tags = $db->prepare('
		SELECT t.handle, t.title
		FROM blockTags bt
			JOIN tags t ON t.id = bt.tagId
		WHERE bt.blockId = ?
		ORDER BY t.handle
	');

	$attributes = $db->prepare('
		SELECT a.handle, a.title
		FROM blockAttributes ba
			JOIN attributes a ON a.id = ba.attributeId
		WHERE ba.blockId = ?
	');

	$collections->execute(array($_GET['handle']));

	if ($collection = $collections->fetch(PDO::FETCH_OBJ)) {
		$response = array(
			'id' => 0 + $collection->id,
			'handle' => $collection->handle,
			'title' => $collection->title,
			'type' => $collection->type,
			'message' => 'Success'
		);

		$blocks->execute(array($collection->id));

		while ($block = $blocks->fetch(PDO::FETCH_OBJ)) {
			$tags->execute(array($block->id));
			$attributes->execute(array($block->id));

			$response['blocks'][] = array(
				'id' => 0 + $block->id,
				'handle' => $block->handle,
				'title' => $block->title,
				'description' => $block->description,
				'content' => $block->content,
				'type' => $block->type,
				'time' => date('c', strtotime($block->time)),
				'tags' => $tags->fetchAll(PDO::FETCH_KEY_PAIR),
				'attributes' => $attributes->fetchAll(PDO::FETCH_KEY_PAIR),
				'hidden' => $block->hidden === 'true',
				'url' => sprintf('#!/%s/%s', $collection->handle, $block->handle)
			);
		}
	} else {
		header('HTTP/1.1 404 Not Found');

		$response = array(
			'message' => 'Not Found'
		);
	}

	print json_encode($response);
?>