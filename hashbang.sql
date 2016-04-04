DELIMITER $$
CREATE FUNCTION TITLE2HANDLE (title VARCHAR(64)) RETURNS VARCHAR(32) DETERMINISTIC BEGIN
  DECLARE c VARCHAR(1);
  DECLARE i INT;
  DECLARE pattern VARCHAR(16);
  DECLARE temp VARCHAR(64);
  DECLARE result VARCHAR(32);

  SET i = 0;
  SET pattern = '[^a-z0-9]';
  SET temp = LOWER(title);
  SET result = '';

  WHILE i <= CHAR_LENGTH(temp) DO
    SET c = SUBSTRING(temp, i, 1);

    IF NOT c REGEXP pattern THEN
      SET result = CONCAT(result, c);
    ELSE
      SET result = CONCAT(result, '-');
    END IF;

    SET i = i + 1;
  END WHILE;

  RETURN result;
END$$
DELIMITER ;

CREATE TABLE attributes (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(256) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE tags (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE collections (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL DEFAULT 'new-collection',
  title varchar(64) NOT NULL DEFAULT 'New Collection',
  description varchar(256) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  PRIMARY KEY (id),
  UNIQUE (handle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DELIMITER $$
CREATE TRIGGER collectionHandle BEFORE UPDATE ON collections
  FOR EACH ROW IF NEW.handle = TITLE2HANDLE(OLD.title) THEN
    SET NEW.handle = TITLE2HANDLE(NEW.title);
  END IF;
$$
DELIMITER ;

CREATE TABLE blocks (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  handle varchar(32) NOT NULL DEFAULT 'new-block',
  title varchar(64) NOT NULL DEFAULT 'New Block',
  description varchar(256) NOT NULL,
  content text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'default',
  time datetime DEFAULT NULL,
  collectionId tinyint(3) unsigned DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE (handle),
  FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DELIMITER $$
CREATE TRIGGER blockHandleTime BEFORE UPDATE ON blocks
  FOR EACH ROW BEGIN
    IF NEW.handle = TITLE2HANDLE(OLD.title) THEN
      SET NEW.handle = TITLE2HANDLE(NEW.title);
    END IF;

    IF NEW.time IS NULL THEN
      SET NEW.time = NOW();
    END IF;
  END;
$$
DELIMITER ;

CREATE TABLE blockAttributes (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(3) unsigned NOT NULL,
  attributeId tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (blockId, attributeId),
  KEY (blockId),
  KEY (attributeId),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (attributeId) REFERENCES attributes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE blockTags (
  id tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  blockId tinyint(3) unsigned NOT NULL,
  tagId tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (blockId, tagId),
  KEY (blockId),
  KEY (tagId),
  FOREIGN KEY (blockId) REFERENCES blocks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO collections VALUES
  (1, 'blog', 'Blog', 'My awesome blog', 'list'),
  (2, 'projects', 'Projects', '', 'list'),
  (3, 'contact', 'Contact', '', 'default'),
  (4, 'drafts', 'Drafts', '', 'default');

INSERT INTO blocks VALUES (1, 'hello-world', 'Hello World!', 'First blog post', '<p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.</p>', 'default', '2012-12-12 12:12:12', 1);