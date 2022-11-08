// JavaScript Document

function showHelp(file)
{
if(file == null)
	{
		file = "http://www.cainetworks.com/products/webcontrol/index.html";
	}
	
	if (window.showModelessDialog) 
	{
		window.showModelessDialog(file, "WebControl PLC Help", "dialogWidth:1100px;dialogHeight:500px;");
	}
	else 
	{
		window.open(file,'WebControl PLC Help', 'height=500px,width=1100px, toolbar=no,directories=no,status=no, menubar=no,scrollbars=yes,resizable=tes ,modal=no');
	}
	
window.location = "http://www.cainetworks.com/products/webcontrol/index.html";

	//alert("Help files not yet avalible!");
}