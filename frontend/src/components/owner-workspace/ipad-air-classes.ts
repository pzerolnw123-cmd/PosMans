export const ipadAirPortraitClass = "[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]";
export const ipadAirLandscapeClass = "[@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]";
export const ipadMiniLandscapeClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]";
export const androidTabletLandscapeClass = "[@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:860px)_and_(orientation:landscape)_and_(any-pointer:coarse)]";

export const ipadAirOnlyHideClass =
  "[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:!hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!hidden [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:860px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!hidden";
export const ipadAirOnlyFlexClass =
  "[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:!flex [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!flex [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:860px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!flex";
export const ipadAirOnlyGridRowsSingleClass =
  "[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:!grid-rows-[minmax(0,1fr)] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!grid-rows-[minmax(0,1fr)] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:860px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!grid-rows-[minmax(0,1fr)]";
export const ipadMiniLandscapeScrollClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:overflow-y-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:overflow-x-hidden";
