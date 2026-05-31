export class SystemService {
  async getSystemData(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    const lines: Array<string> = html.split("\n");
    let isInScript = false;
    let systemData: string | null = null;

    for (const line of lines) {
      if (line.includes("<script>")) {
        isInScript = true;
        continue;
      }

      if (line.includes("</script>")) {
        isInScript = false;
        continue;
      }

      if (isInScript) {
        if (line.includes("window.system = ")) {
          systemData = line.replace("window.system = ", "").trim().slice(0, -1);
          break;
        }
      }
    }

    if (systemData === null) {
      throw new Error(`No system data found for ${url}`);
    }

    try {
      JSON.parse(systemData);
    } catch (error) {
      console.log(systemData);
      throw new Error(`Failed to parse system data for ${url}`);
    }

    return systemData;
  }
}

const systemService = new SystemService();

export default systemService;
