import { PopupApp } from "./src/popup/PopupApp"
import { installPopupErrorLogging } from "./src/popup/services/extension-logs"

import "./src/popup/style.css"

installPopupErrorLogging()

export default PopupApp
