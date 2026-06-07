/**
 * component/Mobile Status Bar — 실기기 안전영역 스페이서.
 *
 * 디자인 파일(.pen)의 9:41·신호·배터리 모형 상태바는 프레임 캡처 전용이라
 * 실제 모바일 브라우저에서는 OS 상태바 아래에 가짜 상태바가 이중으로 쌓여
 * 세로 44px를 낭비하고 정보가 충돌했다. 실앱에서는 모형 chrome을 그리지 않고
 * `env(safe-area-inset-top)` 만큼 차지하는 안전영역 스페이서로 대체한다.
 * inset이 없는 환경에서도 콘텐츠가 상단에 들러붙지 않도록 최소 16px은 확보한다.
 */
export function MobileStatusBar() {
  return (
    <div aria-hidden="true" className="h-[max(env(safe-area-inset-top),16px)] w-full shrink-0" />
  )
}
