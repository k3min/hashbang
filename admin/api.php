<?php
	$dsn = 'mysql:host=HOST;dbname=DATABASE;charset=UTF8';
	$user = 'USER';
	$password = 'PASSWORD';

	try {
		if ($_SERVER['PHP_AUTH_USER'] !== $user && $authPW !== $_SERVER['PHP_AUTH_PW']) {
			header('WWW-Authenticate: Basic');
			throw new Exception('Unauthorized', 401);
		}

		$db = new PDO($dsn, $user, $password, array(
			PDO::ATTR_EMULATE_PREPARES => false
		));

		if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE', 'PUT'])) {
			$json = json_decode(file_get_contents('php://input'));

			$types = [
				'collection' => ['collections', 'id'],
				'block' => ['blocks', 'id'],
				'tag' => ['tags', 'id'],
				'attribute' => ['attributes', 'id'],
				'blockTag' => ['blockTags', 'tagId'],
				'blockAttribute' => ['blockAttributes', 'attributeId'],

				'image/jpeg' => '.jpg',
				'image/png' => '.png',
				'image/svg+xml' => '.svg'
			];

			if (!array_key_exists($json->type, $types)) {
				throw new Exception('Bad Request', 400);
			}

			switch ($_SERVER['REQUEST_METHOD']) {
				case 'POST': {
					$valid = ['handle', 'title', 'description', 'content', 'type', 'time', 'collectionId', 'blockId'];

					if (!in_array($json->key, $valid)) {
						throw new Exception('Bad Request', 400);
					}

					$post = $db->prepare("
						INSERT INTO {$types[$json->type][0]} ({$types[$json->type][1]}, {$json->key})
							VALUES (:id, :key)
						ON DUPLICATE KEY
							UPDATE {$json->key} = :upd
					");

					$post->execute([
						':id' => $json->id,
						':key' => $json->value,
						':upd' => $json->value
					]);

					if (empty($json->id)) {
						$json->id = $db->query('SELECT LAST_INSERT_ID()')->fetchColumn();
						$refresh = true;
					}

					break;
				}

				case 'DELETE': {
					switch ($json->type) {
						case 'blockTag':
						case 'blockAttribute':
							$delete = $db->prepare("DELETE FROM {$types[$json->type][0]} WHERE {$types[$json->type][1]} = ? AND blockId = ?");
							$delete->execute([$json->id, $json->value]);
							break;

						case 'image/jpeg':
						case 'image/png':
						case 'image/svg+xml':
							unlink($json->id);
							break;

						default:
							$delete = $db->prepare("DELETE FROM {$types[$json->type][0]} WHERE {$types[$json->type][1]} = ?");
							$delete->execute([$json->id]);
							break;
					}

					$refresh = true;

					break;
				}

				case 'PUT': {
					if (!is_dir('../res/uploads')) {
						mkdir('../res/uploads', 0700);
					}

					$name = sprintf("../res/uploads/%s{$types[$json->type]}", uniqid());
					$data = base64_decode($json->value);

					file_put_contents($name, $data);

					$refresh = true;

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
			'message' => 'OK',
			'target' => $refresh
		];

		$collections->execute();

		while ($collection = $collections->fetch(PDO::FETCH_OBJ)) {
			$collection->blocks = [];
			$collection->url = "#!/{$collection->handle}";

			if (!$response['target'] && isset($json) && $json->type === 'collection' && $json->id === $collection->id) {
				$response['target'] = $collection->url;
			}

			$blocks->execute([$collection->id]);

			while ($block = $blocks->fetch(PDO::FETCH_OBJ)) {
				$block->url = "#!/{$collection->handle}/{$block->handle}";

				if (!$response['target'] && isset($json) && $json->type === 'block' && $json->id === $block->id) {
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
			'attributes' => $attributes->fetchAll(PDO::FETCH_OBJ),
			'images' => glob('../res/uploads/*.{jpg,png,svg}', GLOB_BRACE)
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

	header("HTTP/1.1 {$response['status']} {$response['message']}");
	header('Cache-Control: no-cache');
	header('Content-Type: application/json');

	print json_encode($response);
?>