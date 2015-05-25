<?php
	$dsn = 'mysql:host=HOST;dbname=DATABASE;charset=UTF8';
	$user = 'USER';
	$password = 'PASSWORD';

	try {
		$db = new PDO($dsn, $user, $password, array(
			PDO::ATTR_EMULATE_PREPARES => false
		));

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
				'status' => 200,
				'message' => 'OK'
			];

			$collection->blocks = [];
			$collection->url = '#!/' . $collection->handle;

			$blocks->execute([$collection->id]);

			while ($block = $blocks->fetch(PDO::FETCH_OBJ)) {
				$tags->execute([$block->id]);
				$attributes->execute([$block->id]);

				$block->time = date('c', strtotime($block->time));
				$block->tags = $tags->fetchAll(PDO::FETCH_KEY_PAIR);
				$block->attributes = $attributes->fetchAll(PDO::FETCH_KEY_PAIR);
				$block->url = sprintf('#!/%s/%s', $collection->handle, $block->handle);

				$collection->blocks[] = $block;
			}

			$response += (array)$collection;
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