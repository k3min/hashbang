<?php
	$dsn = 'mysql:host=HOST;dbname=DATABASE;charset=UTF8';
	$user = 'USER';
	$password = 'PASSWORD';

	try {
		$db = new PDO($dsn, $user, $password);

		$collections = $db->prepare('SELECT * FROM collections WHERE handle = ?');
		$blocks = $db->prepare('SELECT * FROM blocks WHERE collectionId = ?');

		$tags = $db->prepare('
			SELECT t.handle, t.title
			FROM blockTags bt
				JOIN tags t ON t.id = bt.tagId
			WHERE bt.blockId = ?
		');

		$attributes = $db->prepare('
			SELECT a.handle, a.title
			FROM blockAttributes ba
				JOIN attributes a ON a.id = ba.attributeId
			WHERE ba.blockId = ?
		');

		$collections->execute([$_GET['handle']]);

		if ($collection = $collections->fetch(PDO::FETCH_OBJ)) {
			$response = [
				'id' => 0 + $collection->id,
				'handle' => $collection->handle,
				'title' => $collection->title,
				'description' => $collection->description,
				'type' => $collection->type,
				'status' => 200,
				'message' => 'Success'
			];

			$blocks->execute([$collection->id]);

			while ($block = $blocks->fetch(PDO::FETCH_OBJ)) {
				$tags->execute([$block->id]);
				$attributes->execute([$block->id]);

				$response['blocks'][] = [
					'id' => 0 + $block->id,
					'handle' => $block->handle,
					'title' => $block->title,
					'description' => $block->description,
					'content' => $block->content,
					'type' => $block->type,
					'time' => date('c', strtotime($block->time)),
					'tags' => $tags->fetchAll(PDO::FETCH_KEY_PAIR),
					'attributes' => $attributes->fetchAll(PDO::FETCH_KEY_PAIR),
					'url' => sprintf('#!/%s/%s', $collection->handle, $block->handle)
				];
			}
		} else {
			$response = [
				'status' => 404,
				'message' => 'Not Found'
			];
		}
	} catch (PDOException $e) {
		$response = [
			'status' => 500,
			'message' => 'Internal Server Error'
		];
	}

	header(sprintf('HTTP/1.1 %d %s', $response['status'], $response['message']));
	header('Cache-Control: no-cache');
	header('Content-Type: application/json');

	print json_encode($response);
?>