module.exports = (n)=>{
  var special = ['Zeroth','First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelvth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth'];
  var deca = ['Twent', 'Thirt', 'Fourt', 'Fift', 'Sixt', 'Sevent', 'Eight', 'Ninet'];
  if (n < 20) return special[n];
  if (n%10 === 0) return deca[Math.floor(n/10)-2] + 'ieth';
  return deca[Math.floor(n/10)-2] + 'y-' + special[n%10];

}
