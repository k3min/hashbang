<?php
	$dsn = 'mysql:host=HOST;dbname=DATABASE;charset=UTF8';
	$user = 'USER';
	$password = 'PASSWORD';

	try {
		if ($_SERVER['PHP_AUTH_USER'] !== $user && $_SERVER['PHP_AUTH_PW'] !== $password) {
			header('WWW-Authenticate: Basic');
			throw new Exception('Unauthorized', 401);
		}

		$db = new PDO($dsn, $user, $password, array(
			PDO::ATTR_EMULATE_PREPARES => false
		));

		if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
			$json = json_decode(file_get_contents('php://input'));

			$types = [
				'collection' => 'collections',
				'block' => 'blocks'
			];

			if (!array_key_exists($json->type, $types)) {
				throw new Exception('Bad Request', 400);
			}

			switch ($_SERVER['REQUEST_METHOD']) {
				case 'POST': {
					$valid = ['handle', 'title', 'description', 'content', 'type', 'time', 'collectionId'];

					if (!in_array($json->key, $valid)) {
						throw new Exception('Bad Request', 400);
					}

					$post = $db->prepare("
						INSERT INTO {$types[$json->type]} (id, {$json->key})
							VALUES (:id, :key)
						ON DUPLICATE KEY
							UPDATE {$json->key} = :upd
					");

					$post->execute([
						':id' => $json->id,
						':key' => $json->value,
						':upd' => $json->value
					]);

					if (!isset($json->id)) {
						$json->id = $db->query('SELECT LAST_INSERT_ID()')->fetchColumn();
					}

					break;
				}

				case 'DELETE': {
					$delete = $db->prepare("DELETE FROM {$types[$json->type]} WHERE id = ?");
					$delete->execute([$json->id]);

					break;
				}
			}
		}

		$collections = $db->prepare('SELECT id, handle, title FROM collections');
		$blocks = $db->prepare('SELECT id, handle, title FROM blocks WHERE collectionId = ?');
		$tags = $db->prepare('SELECT * FROM tags');
		$attributes = $db->prepare('SELECT * FROM attributes');

		$response = [
			'status' => 200,
			'message' => 'OK'
		];

		$collections->execute();

		while ($collection = $collections->fetch(PDO::FETCH_OBJ)) {
			$collection->blocks = [];
			$collection->url = '#!/' . $collection->handle;

			if (isset($json) && $json->type === 'collection' && $json->id === $collection->id) {
				$response['target'] = $collection->url;
			}

			$blocks->execute([$collection->id]);

			while ($block = $blocks->fetch(PDO::FETCH_OBJ)) {
				$block->url = sprintf('#!/%s/%s', $collection->handle, $block->handle);

				if (isset($json) && $json->type === 'block' && $json->id === $block->id) {
					$response['target'] = $block->url;
				}

				$collection->blocks[] = $block;
			}

			$response['collections'][] = $collection;
		}

		$tags->execute();
		$attributes->execute();

		$response += [
			'tags' => $tags->fetchAll(PDO::FETCH_OBJ),
			'attributes' => $attributes->fetchAll(PDO::FETCH_OBJ)
		];
	} catch (PDOException $e) {
		$response = [
			'status' => 500,
			'message' => 'Internal Server Error'
		];
	} catch (Exception $e) {
		$response = [
			'status' => $e->getCode(),
			'message' => $e->getMessage()
		];
	}

	header(sprintf('HTTP/1.1 %d %s', $response['status'], $response['message']));
	header('Cache-Control: no-cache');
	header('Content-Type: application/json');

	print json_encode($response);
?>