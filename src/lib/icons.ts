/**
 * Centralized icon registry – Font Awesome 6 (free)
 *
 * Every icon used in the app is re-exported from here with a semantic alias so
 * that changing icon libraries in the future requires touching only this file.
 *
 * Usage:
 *   import { FontAwesomeIcon, iconTruck, iconPlus } from "@/lib/icons";
 *   <FontAwesomeIcon icon={iconTruck} className="h-4 w-4" />
 */

// Re-export the component itself so consumers don't need a separate import.
export { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
export type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/** Type-guard: true when the value is an FA IconDefinition (not a React component). */
export function isIconDefinition(v: unknown): v is import("@fortawesome/fontawesome-svg-core").IconDefinition {
  return typeof v === "object" && v !== null && "iconName" in v;
}

// ── Solid icons ─────────────────────────────────────────────────────────────
import {
  faArrowLeft,
  faArrowRight,
  faArrowTrendDown,
  faArrowTrendUp,
  faBars,
  faBell,
  faBug,
  faCalculator,
  faCamera,
  faChartColumn,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircle,
  faCircleCheck,
  faCircleInfo,
  faCirclePlay,
  faCircleQuestion,
  faClock,
  faClockRotateLeft,
  faCloud,
  faCommentDots,
  faCopy,
  faDesktop,
  faDollarSign,
  faDroplet,
  faEllipsis,
  faEllipsisVertical,
  faFileArrowDown,
  faFileLines,
  faGasPump,
  faGauge,
  faGear,
  faGripVertical,
  faHeart,
  faHouse,
  faImage,
  faLightbulb,
  faLocationDot,
  faLock,
  faMagnifyingGlass,
  faMap,
  faMicrophone,
  faMicrophoneSlash,
  faMoon,
  faPaperPlane,
  faPause,
  faPencil,
  faPercent,
  faPhone,
  faPlay,
  faPlus,
  faReceipt,
  faRightFromBracket,
  faRotate,
  faRoute,
  faRuler,
  faScaleBalanced,
  faShareNodes,
  faShield,
  faSpinner,
  faSun,
  faTableColumns,
  faTowerBroadcast,
  faTrash,
  faTriangleExclamation,
  faTruck,
  faUser,
  faUsers,
  faVolumeHigh,
  faWallet,
  faWandMagicSparkles,
  faWrench,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

// ── Semantic aliases (sorted alphabetically by alias) ───────────────────────
// Navigation / chrome
export const iconAlertTriangle = faTriangleExclamation;
export const iconArrowLeft = faArrowLeft;
export const iconArrowRight = faArrowRight;
export const iconBarChart2 = faChartColumn;
export const iconBell = faBell;
export const iconBug = faBug;
export const iconCalculator = faCalculator;
export const iconCamera = faCamera;
export const iconCheck = faCheck;
export const iconCheckCircle = faCircleCheck;
export const iconCheckCircle2 = faCircleCheck;
export const iconChevronDown = faChevronDown;
export const iconChevronLeft = faChevronLeft;
export const iconChevronRight = faChevronRight;
export const iconChevronUp = faChevronUp;
export const iconCircle = faCircle;
export const iconCircleCheck = faCircleCheck;
export const iconClock3 = faClock;
export const iconCloudOff = faCloud;
export const iconCopy = faCopy;
export const iconDesktop = faDesktop;
export const iconDollarSign = faDollarSign;
export const iconDot = faCircle;
export const iconDroplets = faDroplet;
export const iconFileDown = faFileArrowDown;
export const iconFileText = faFileLines;
export const iconFuel = faGasPump;
export const iconGauge = faGauge;
export const iconGear = faGear;
export const iconGripVertical = faGripVertical;
export const iconHeart = faHeart;
export const iconHelpCircle = faCircleQuestion;
export const iconHistory = faClockRotateLeft;
export const iconHome = faHouse;
export const iconImage = faImage;
export const iconInfo = faCircleInfo;
export const iconLightbulb = faLightbulb;
export const iconLoader2 = faSpinner;
export const iconLock = faLock;
export const iconLogOut = faRightFromBracket;
export const iconMap = faMap;
export const iconMapPin = faLocationDot;
export const iconMenu = faBars;
export const iconMessageCircle = faCommentDots;
export const iconMic = faMicrophone;
export const iconMicOff = faMicrophoneSlash;
export const iconMonitor = faDesktop;
export const iconMoon = faMoon;
export const iconMoreHorizontal = faEllipsis;
export const iconMoreVertical = faEllipsisVertical;
export const iconPanelLeft = faTableColumns;
export const iconPause = faPause;
export const iconPencil = faPencil;
export const iconPercent = faPercent;
export const iconPhone = faPhone;
export const iconPlay = faPlay;
export const iconPlayCircle = faCirclePlay;
export const iconPlus = faPlus;
export const iconRadio = faTowerBroadcast;
export const iconReceipt = faReceipt;
export const iconRefreshCw = faRotate;
export const iconRoute = faRoute;
export const iconRuler = faRuler;
export const iconScale = faScaleBalanced;
export const iconSearch = faMagnifyingGlass;
export const iconSend = faPaperPlane;
export const iconSettings = faGear;
export const iconShare2 = faShareNodes;
export const iconShield = faShield;
export const iconSparkles = faWandMagicSparkles;
export const iconSun = faSun;
export const iconTrash2 = faTrash;
export const iconTrendingDown = faArrowTrendDown;
export const iconTrendingUp = faArrowTrendUp;
export const iconTruck = faTruck;
export const iconUser = faUser;
export const iconUsers = faUsers;
export const iconVolume2 = faVolumeHigh;
export const iconWallet = faWallet;
export const iconWrench = faWrench;
export const iconX = faXmark;

