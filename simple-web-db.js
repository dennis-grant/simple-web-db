var DeaconDB = function() {
	var Connection = function(_dataFieldId) {
		this.init = function() {
			this.recordListProcessor = new RecordListProcessor(_dataFieldId);
			this.recordListProcessor.loadData();
		};

		this.selectRecords = function(tableName, fieldNames, matchingConditions) {
			var selector = new RecordsSelector(this.recordListProcessor, tableName, fieldNames, matchingConditions);
			return selector.execute();
		};

		this.getMaxFieldValue = function(tableName, fieldName) {
			var getter = new MaxFieldValueGetter(this.recordListProcessor, tableName, fieldName);
			return getter.execute();
		};

		this.deleteRecords = function(tableName, matchingConditions) {
			var deleter = new RecordsDeleter(this.recordListProcessor, tableName, matchingConditions);
			return deleter.execute();
		};

		this.updateRecords = function(tableName, matchingConditions, newValues) {
			var updater = new RecordsUpdater(this.recordListProcessor, tableName, matchingConditions, newValues);
			updater.execute();
		};

		this.addRecord = function(tableName, record) {
			this.recordListProcessor.addRecord(tableName, record);
		};

		this.loadData = function() {
			this.recordListProcessor.loadData();
		};

		this.dumpData = function() {
			this.recordListProcessor.dumpData();
		};

		this.init();
	};

	var RecordsSelector = function(_recordsProcessor, _tableName, _fieldNames, _matchingConditions) {
		var self = this;

		this.init = function() {
			this.tableName = _tableName;
			this.fieldNames = _fieldNames;
			this.matchingConditions = _matchingConditions;
			this.selectedRecords = undefined;
			this.recordsProcessor = _recordsProcessor;
		};

		this.execute = function() {
			this.selectedRecords = [];
			this.recordsProcessor.scanRecords(this.tableName, this.matchingConditions, this.selectProcessFunc);
			return this.selectedRecords;
		};

		this.selectProcessFunc = function(recordList, record) {
			var tmpRec;

			tmpRec = self.recordsProcessor.getFieldsFromRecord(record, self.fieldNames);
			self.selectedRecords[self.selectedRecords.length] = tmpRec;
		};

		this.init();
	};

	var RecordsDeleter = function(_recordsProcessor, _tableName, _matchingConditions) {
		var self = this;

		this.init = function() {
			this.tableName = _tableName;
			this.matchingConditions = _matchingConditions;
			this.deleteCount = 0;
			this.recordsProcessor = _recordsProcessor;
		};

		this.execute = function() {
			this.deleteCount = 0;
			this.recordsProcessor.scanRecords(this.tableName, this.matchingConditions, this.deleteProcessFunc);
			return this.deleteCount;
		};

		this.deleteProcessFunc = function(recordList, record, recordIndex) {
			recordList.splice(recordIndex, 1);
			self.deleteCount++;
		};

		this.init();
	};

	var RecordsUpdater = function(_recordsProcessor, _tableName, _matchingConditions, _newValues) {
		var self = this;

		this.init = function() {
			this.tableName = _tableName;
			this.matchingConditions = _matchingConditions;
			this.newValues = _newValues;
			this.recordsProcessor = _recordsProcessor;
		};

		this.execute = function() {
			this.recordsProcessor.scanRecords(this.tableName, this.matchingConditions, this.updateProcessFunc);
		};

		this.updateProcessFunc = function(recordList, record) {
			self.recordsProcessor.updateRecordFields(record, self.newValues);
		};

		this.init();
	};

	var MaxFieldValueGetter = function(_recordsProcessor, _tableName, _fieldName) {
		var self = this;

		this.init = function() {
			this.tableName = _tableName;
			this.fieldName = _fieldName;
			this.maxValue = undefined;
			this.recordsProcessor = _recordsProcessor;
		};

		this.execute = function() {
			this.maxValue = undefined;
			this.recordsProcessor.scanRecords(this.tableName, [], this.maxFieldValueProcessFunc);
			return this.maxValue;
		};

		this.maxFieldValueProcessFunc = function(recordList, record) {
			if (self.maxValue === undefined || record[self.fieldName] > self.maxValue) {
				self.maxValue = record[self.fieldName];
			}
		};

		this.init();
	};

	var RecordListProcessor = function(_dataFieldId) {
		this.init = function() {
			this.dataFieldId = _dataFieldId;
			this.loadData();
		};

		this.scanRecords = function(tableName, matchingConditions, processFunc) {
			var recordList;

			recordList = this.data[tableName];
			for (var i = recordList.length - 1; i >= 0; i--) {
				if (this.recordMatchConditionList(recordList[i], matchingConditions) === true) {
					processFunc(recordList, recordList[i], i);
				}
			}
		};

		this.addRecord = function(tableName, record) {
			var recordList;

			recordList = this.data[tableName];
			recordList[recordList.length] = record;
		};

		this.recordMatchConditionList = function(record, conditionList) {
			var match;
			var index;

			index = 0
			match = true
			while (match && index < conditionList.length) {
				match = conditionList[index].match(record);
				index += 1;
			}

			return match;
		};

		this.getFieldsFromRecord = function(record, fields) {
			var tmpRec;
			var fieldName;

			tmpRec = {}
			for (var i = 0; i < fields.length; i++) {
				fieldName = $.trim(fields[i]);
				tmpRec[fieldName] = record[fieldName];
			}

			return tmpRec;
		};

		this.updateRecordFields = function(record, newValues) {
			for (var prop in record) {
				if (newValues[prop] !== undefined) {
					record[prop] = newValues[prop];
				}
			}
		};

		this.loadData = function() {
			var dataFieldValue;

			dataFieldValue = $.trim($("#" + this.dataFieldId).val());
			if (dataFieldValue !== "") {
				this.data = eval("(" + dataFieldValue + ")");
			}
			else {
				this.data = {};
			}
		};

		this.dumpData = function() {
			var dataOutStr;

			dataOutStr = '{\n';
			dataOutStr += this.dumpTables();
			dataOutStr += '\n';
			dataOutStr += '}\n';

			$("#" + this.dataFieldId).val(dataOutStr);
		};

		this.dumpTables = function() {
			var firstTable;
			var dataOutStr;

			firstTable = true;
			dataOutStr = '';
			for (var tableName in this.data) {
				if (firstTable === false) {
					dataOutStr += ',\n';
				}
				dataOutStr += this.dumpTable(tableName, this.data[tableName]);
				firstTable = false;
			}

			return dataOutStr;
		};

		this.dumpTable = function(tableName, recordList) {
			var firstRecord;
			var dataOutStr;

			firstRecord = true;
			dataOutStr = '\t' + tableName + ': [\n';
			for (var recordIndex in recordList) {
				if (firstRecord === false) {
					dataOutStr += ',\n';
				}
				dataOutStr += this.dumpRecord(recordList[recordIndex]);
				firstRecord = false;
			}
			dataOutStr += '\n\t]';

			return dataOutStr;
		};

		this.dumpRecord = function(record) {
			var firstFld;
			var dataOutStr;
			var val;

			firstFld = true;
			dataOutStr = '\t\t{';
			for (var fld in record) {
				if (firstFld === false) {
					dataOutStr += ', ';
				}
				dataOutStr += fld + ': ';
				val = record[fld];
				dataOutStr += (typeof(val) === 'number') ? val : '"' + val + '"';
				firstFld = false;
			}
			dataOutStr += '}';

			return dataOutStr;
		};

		this.init();
	};

	var Condition = function(_fieldName, _fieldValue, _op) {
		this.init = function() {
			var tmpVal;

			this.op = (_op === undefined) ? "=" : $.trim(_op);
			this.fieldName = _fieldName;
			if (this.op === "in") {
				this.fieldValue = {};
				for (var i in _fieldValue) {
					tmpVal = $.trim("" + _fieldValue[i]);
					this.fieldValue["vp" + tmpVal] = true;
				}
			}
			else {
				this.fieldValue = _fieldValue;
			}
		};

		this.match = function(record) {
			var value1;
			var value2;
			var isMatch;

			value1 = record[this.fieldName]
			value2 = this.fieldValue

			if (this.op === ">") {
				isMatch = (value1 > value2);
			}
			else if (this.op === "<") {
				isMatch = (value1 < value2);
			}
			else if (this.op === "=") {
				isMatch = (value1 == value2);
			}
			else if (this.op === "in") {
				isMatch = (value2["vp" + value1] === true);
			}
			else {
				isMatch = false;
			}

			return isMatch;
		};
		
		this.init();
	};
	
	return {
		"Connection": Connection,
		"Condition": Condition
	};
}();
