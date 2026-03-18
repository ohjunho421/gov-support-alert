import axios from "axios";
import type { NewGovProgram } from "../db/schema";

const BIZINFO_API_URL =
  "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";

interface BizInfoItem {
  pblancNm: string;
  jrsdInsttNm: string;
  reqstBeginEndDe: string;
  pblancUrl: string;
  bsnsSumryCn: string;
  sprtCn: string;
  pldirSportRealmLclasCodeNm: string;
  areaNm: string;
}

export async function collectFromBizinfo(): Promise<NewGovProgram[]> {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey) {
    console.warn("[BizInfo] API key not set, skipping");
    return [];
  }

  try {
    const response = await axios.get(BIZINFO_API_URL, {
      params: {
        crtfcKey: apiKey,
        dataType: "json",
        pageUnit: 50,
        pageIndex: 1,
      },
      timeout: 30000,
    });

    const items: BizInfoItem[] =
      response.data?.jsonArray || response.data?.items || [];

    return items.map((item) => {
      const deadlineStr = item.reqstBeginEndDe?.split("~")[1]?.trim();

      return {
        title: item.pblancNm,
        description: item.bsnsSumryCn || item.sprtCn || "",
        organization: item.jrsdInsttNm,
        supportAmount: item.sprtCn || null,
        deadline: deadlineStr || null,
        applyUrl: item.pblancUrl || null,
        sourceUrl: item.pblancUrl || null,
        source: "bizinfo",
        category: item.pldirSportRealmLclasCodeNm || null,
        region: item.areaNm || null,
        rawData: item,
      };
    });
  } catch (error) {
    console.error("[BizInfo] Collection failed:", error);
    return [];
  }
}
