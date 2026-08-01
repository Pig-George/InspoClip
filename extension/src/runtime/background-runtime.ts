import { getServerUrl } from "../background/settings"
import { RuntimeFactory } from "./runtime-factory"

const runtimeFactory = new RuntimeFactory()

export async function getBackgroundRuntime() {
  return runtimeFactory.get({
    mode: "backend",
    serverUrl: await getServerUrl()
  })
}
