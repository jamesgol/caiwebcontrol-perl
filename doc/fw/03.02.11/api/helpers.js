// JavaScript Document

String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
}

String.prototype.substr = function (idx, cnt) {
	
	if(idx + cnt > this.length)
	{
		return null;
	}
	
	return this.substring(idx, idx + cnt);
	
}

Array.prototype.indexOf = function (obj) {
	
	var idx = -1;
	for(var i = 0; i<this.length; i++)
	{
		if(this[i] == obj)
		{
			idx = i;
			break;
		}
	}
	
	return idx;
	
}
