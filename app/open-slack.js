module.exports = (channelId) => {
  return `
<!DOCTYPE html>
<html itemscope itemtype="http://schema.org/QAPage">
<head>

<title>Open Slack: ${channelId}</title>
</head>
<body>
<script type="text/javascript">
  alert('test');
</script>
</body>
</html>
  `;
};
