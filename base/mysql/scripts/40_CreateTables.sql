CREATE TABLE IF NOT EXISTS `controller` (
  `oid` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `linked` TINYINT(1) NOT NULL,
  `macAddress` VARCHAR(255) NULL DEFAULT NULL,
  `account_oid` BIGINT(20) NULL DEFAULT NULL,
  PRIMARY KEY (`oid`) ,
  INDEX `IDX__CONTROLLER__ACCOUNT_OID` (`account_oid` ASC) ,
  CONSTRAINT `FK__CONTROLLER__ACCOUNT__ACCOUNT_OID`
    FOREIGN KEY (`account_oid`)
    REFERENCES `account` (`oid`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

CREATE TABLE IF NOT EXISTS `controller_command` (
  `oid` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `creationDate` DATETIME NULL DEFAULT NULL,
  `state` VARCHAR(255) NULL DEFAULT NULL,
  `type` VARCHAR(255) NULL DEFAULT NULL,
  `account_oid` BIGINT(20) NULL DEFAULT NULL,
  PRIMARY KEY (`oid`) ,
  INDEX `IDX__CONTROLLER_COMMAND__ACCOUNT_OID` (`account_oid` ASC) ,
  CONSTRAINT `FK__CONTROLLER_COMMAND__ACCOUNT__ACCOUNT_OID`
    FOREIGN KEY (`account_oid`)
    REFERENCES `account` (`oid`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;

CREATE TABLE IF NOT EXISTS `initiate_proxy_controller_command` (
  `oid` BIGINT(20) NOT NULL,
  `token` VARCHAR(255) NULL DEFAULT NULL,
  `url` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`oid`) ,
  INDEX `IDX__INITIATE_PROXY_CONTROLLER_COMMAND__OID` (`oid` ASC) ,
  CONSTRAINT `FK__INITIATE_PROXY_CONTROLLER_COMMAND__CONTROLLER_COMMAND__OID`
    FOREIGN KEY (`oid`)
    REFERENCES `controller_command` (`oid`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;