let form = {
    // add all data from input into this object
}

function showError() {
    var x = document.getElementById("errorDIV");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

function retrieveInfo() {
  var searchInput = document.getElementById("searchInput").value;
  var startDate = document.getElementById("startDate").value;
  var endDate = document.getElementById("endDate").value;
  var NERCheck = document.getElementById("NERCheck").checked;
  var fileUpload = document.getElementById("fileUpload").value;
  console.log("Search Input: " + searchInput + "\nStart Date: " + startDate + "\nEnd Date: " + endDate + "\nNER Check: " + NERCheck + "\nFile Upload: " + fileUpload);
}