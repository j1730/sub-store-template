const { type, name } = $arguments;
const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};
const regions = {
  hk: /港|hk|hongkong|kong kong|🇭🇰/i,
  tw: /台|tw|taiwan|🇹🇼/i,
  jp: /日本|jp|japan|🇯🇵/i,
  sg: /^(?!.*(?:us)).*(新|sg|singapore|🇸🇬)/i,
  us: /美|us|unitedstates|united states|🇺🇸/i,
  openai: /^(?!.*\b(港|台|香港|台湾|中国|cn|hk|tw)\b).+$/i,
};

let compatible;
let config = JSON.parse($files[0]);

// 获取所有的节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 把所有节点加入配置文件
config.outbounds.push(...proxies);

// 用于记录策略组的 tag
const regionTags = [];

// 1. 为每个国家创建 test 策略组
Object.entries(regions).forEach(([regionKey, regex]) => {
  const matchedTags = getTags(proxies, regex);
  if (matchedTags.length === 0) return;

  const groupTag = regionKey;
  regionTags.push(groupTag);

  let group = config.outbounds.find((o) => o.tag === groupTag);
  if (!group) {
    group = {
      tag: groupTag,
      type: "test",
      outbounds: [],
    };
    config.outbounds.push(group);
  }

  group.outbounds = Array.from(new Set([...group.outbounds, ...matchedTags]));
});

// 添加到 proxy 和 auto
const globalGroups = [
  { tag: "proxy", type: "selector" },
  { tag: "auto", type: "urltest" },
];
globalGroups.forEach((g) => {
  let group = config.outbounds.find((o) => o.tag === g.tag);
  if (!group) {
    group = {
      tag: g.tag,
      type: g.type,
      outbounds: [],
    };
    config.outbounds.push(group);
  }

  group.outbounds = Array.from(new Set([...group.outbounds, ...regionTags]));
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag
  );
}
