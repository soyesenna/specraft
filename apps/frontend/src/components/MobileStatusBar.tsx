/**
 * component/Mobile Status Bar — 실기기 안전영역 스페이서.
 *
 * 디자인 파일(.pen)의 9:41·신호·배터리 모형 상태바는 프레임 캡처 전용이라
 * 실제 모바일 브라우저에서는 OS 상태바 아래에 가짜 상태바가 이중으로 쌓여
 * 세로 44px를 낭비하고 정보가 충돌했다. 실앱에서는 모형 chrome을 그리지 않고
 * `env(safe-area-inset-top)` 만큼만 차지하는 순수 안전영역 스페이서로 대체한다.
 * (notch/inset 미존재 브라우저에서는 0으로 접혀 공간을 낭비하지 않는다.)
 */
export function MobileStatusBar() {
  return <div aria-hidden="true" className="w-full shrink-0 h-[env(safe-area-inset-top)]" />
}
