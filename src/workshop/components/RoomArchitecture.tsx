import { useId } from "react";

/** Static construction and light surfaces. No world state or simulation lives here. */
export function RoomArchitecture() {
  const id = useId();
  return (
    <svg className="room-architecture" viewBox="0 0 1000 600" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-wall`} x2="0.1" y2="1">
          <stop stopColor="#3b4a50" />
          <stop offset="1" stopColor="#263238" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x2="0" y2="1">
          <stop stopColor="#303b3e" />
          <stop offset="1" stopColor="#475052" />
        </linearGradient>
        <linearGradient id={`${id}-side`}>
          <stop stopColor="#192328" />
          <stop offset="1" stopColor="#2d393e" />
        </linearGradient>
        <radialGradient id={`${id}-pool`}>
          <stop stopColor="#e8bd7c" stopOpacity=".48" />
          <stop offset=".55" stopColor="#cba86c" stopOpacity=".2" />
          <stop offset="1" stopColor="#cba86c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x2="0" y2="1">
          <stop stopColor="#f5d6a0" stopOpacity=".14" />
          <stop offset="1" stopColor="#e8bd7c" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-wash`} cx=".64" cy=".3" r=".66">
          <stop stopColor="#e8bd7c" stopOpacity=".17" />
          <stop offset="1" stopColor="#e8bd7c" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <clipPath id={`${id}-aperture`}>
          <path d="M56 24H944L976 56V544L944 576H56L24 544V56Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-aperture)`}>
        <path fill="#152025" d="M0 0H1000V600H0Z" />
        <path fill={`url(#${id}-wall)`} d="M120 80H880V365H120Z" />
        <path fill={`url(#${id}-side)`} d="M24 56L120 80V365L24 552Z" />
        <path fill="#263137" d="M880 80L976 56V552L880 365Z" />
        <path fill="#202b30" d="M24 56L120 80H880L976 56Z" />
        <path fill={`url(#${id}-floor)`} d="M120 365H880L986 582H14Z" />
        <g fill="none" stroke="#677377" strokeOpacity=".16">
          <path d="M120 80H880V365H120ZM120 80V365M310 80V365M690 80V365" />
          <path d="M120 365L24 552M310 365L256 576M500 365V576M690 365L744 576M880 365L976 552" />
          <path d="M102 401H898M77 452H923M48 514H952" />
        </g>
        <path d="M120 359H880" stroke="#0d181e" strokeWidth="9" />
        <path d="M120 367H880" stroke="#657073" strokeOpacity=".3" />
        <g fill="none" strokeLinecap="round">
          <path d="M245 292V160Q245 148 257 148H620V122" stroke="#172126" strokeWidth="9" />
          <path d="M245 292V160Q245 148 257 148H620V122" stroke="#4d5a5d" strokeWidth="3" />
          <path d="M265 410V444Q265 455 286 455H746Q770 455 770 430V411" stroke="#1d282c" strokeWidth="7" />
          <path d="M265 410V444Q265 455 286 455H746Q770 455 770 430V411" stroke="#77807a" strokeOpacity=".2" strokeWidth="2" />
        </g>
        <g fill="#6d797c" opacity=".4">
          {[170, 285, 400, 515, 730, 845].map((x) => <circle key={x} cx={x} cy="98" r="2" />)}
        </g>
        <g fill="#1a252a" stroke="#5a686c" strokeOpacity=".3">
          {[0, 1, 2, 3].map((n) => <rect key={n} x="147" y={190 + n * 8} width="40" height="3" rx="1.5" />)}
        </g>
        <path d="M879 106L934 93V305L879 319" fill="none" stroke="#617075" strokeOpacity=".18" />
        <path d="M136 344H164M836 344H864" stroke="#8b9694" strokeOpacity=".4" />
        <g className="room-light">
          <path fill={`url(#${id}-wash)`} d="M24 56H976V552H24Z" />
          <path fill={`url(#${id}-beam)`} d="M584 191H664L871 508H370Z" />
          <ellipse cx="623" cy="460" rx="260" ry="108" fill={`url(#${id}-pool)`} />
          <path d="M484 513H749" stroke="#e8bd7c" strokeOpacity=".11" />
        </g>
        <rect x="24" y="24" width="952" height="552" filter={`url(#${id}-grain)`} opacity=".032" />
      </g>
      <path d="M56 24H944L976 56V544L944 576H56L24 544V56Z" fill="none" stroke="#0c151a" strokeWidth="12" />
      <path d="M57 17H943L983 57V543L943 583H57L17 543V57Z" fill="none" stroke="#667277" strokeOpacity=".45" />
      <path d="M59 30H941L970 59" fill="none" stroke="#bac2c0" strokeOpacity=".13" />
      <g fill="#111b20" stroke="#5d6b71" strokeWidth="1">
        {[[37, 38], [963, 38], [37, 562], [963, 562]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="4" />
            <path d={`M${x - 2} ${y + 2}l4 -4`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
