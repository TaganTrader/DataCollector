CREATE DATABASE <SHEMA_NAME> CHARACTER SET utf8 COLLATE utf8_general_ci;
use <SHEMA_NAME>;

CREATE TABLE `xbtusd_1` (
  `timestamp` int(11) NOT NULL,
  `open` double DEFAULT NULL,
  `close` double DEFAULT NULL,
  `low` double DEFAULT NULL,
  `high` double DEFAULT NULL,
  `volume` double DEFAULT NULL,
  `trades` int(11) DEFAULT NULL,
  `month` tinyint(4) DEFAULT NULL,
  `year` int(4) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`timestamp`),
  KEY `month_year` (`month`,`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
