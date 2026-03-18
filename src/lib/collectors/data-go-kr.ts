import axios from "axios";
import type { NewGovProgram } from "../db/schema";

const API_URL =
  "https://apis.data.go.kr/1160100/service/GetBizContrSptSvc/getBizContrSptList";

interface DataGoKrItem {
  bsnNm: string;
  bsnSmrCn: string;
  jrsdMnofcNm: string;
  sprtrptCn: string;
  rcptBgngDt: string;
  rcptEndDt: string;
  bsnUrl: string;
  bizCtgNm: string;
}

export async function collectFromDataGoKr(): Promise<NewGovProgram[]> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    console.warn("[DataGoKr] API key not set, skipping");
    return [];
  }

  try {
    const response = await axios.get(API_URL, {
      params: {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: 50,
        resultType: "json",
      },
      timeout: 30000,
    });

    const items: DataGoKrItem[] =
      response.data?.response?.body?.items?.item || [];

    return items.map((item) => ({
      title: item.bsnNm,
      description: item.bsnSmrCn || "",
      organization: item.jrsdMnofcNm || null,
      supportAmount: item.sprtrptCn || null,
      deadline: item.rcptEndDt || null,
      applyUrl: item.bsnUrl || null,
      sourceUrl: item.bsnUrl || null,
      source: "data-go-kr",
      category: item.bizCtgNm || null,
      region: null,
      rawData: item,
    }));
  } catch (error) {
    console.error("[DataGoKr] Collection failed:", error);
    return [];
  }
}
