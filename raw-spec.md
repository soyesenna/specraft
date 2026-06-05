# AI-Driven Development 를 위한 프로젝트 spec 관리 프로젝트 
- 가칭-specraft

## 문제 배경
- 여러 팀원이 서로 AI-Driven Development 를 진행하면 기능 spec 은 빠르게 진화하고 변화하는데 그걸 사람이 항상 정확하게 인지하기 어려움.
- 또한, AI 에이전트는 작업을 시작할 때 이 프로젝트에 대한 내용, 코드, spec, 구현 진도 등의 정보를 아무것도 모르므로 항상 프로젝트 코드(repository) 를 탐색해야함. --> 매우 비효율적임.

## 해결 방법
### 프로젝트 단일 spec 및 명세 source 를 만든다.
- 하지만 문서가 계속 쌓이기만하면 관리가 힘들고 여러 사람이 동시에 작업하면 충돌할 가능성이 높다.
- 또한, 사람의 실수로 최신 문서를 참조하도록 설정하지 않는다면, 협력자Q가  특정 spec A 를 수정했지만 그걸 모르고 spec A 를 협력자W 가 수정한다면 spec 충돌이 일어난다.
- 따라서 references/llm-wiki.md 방법론을 따라 문서를 편집하고 관리, 질의에 대한 응답 등 문서에 대한건 전적으로 llm 에게 맡긴다. 사람은 열람만 가능하고 수정은 불가능하다. 

## 프로젝트 개요
- claude code, codex 플러그인 형태로 제작하여 사용자 프롬프트 제출(세션 시작)시 항상 반드시, 원격에 떠있는 프로젝트의 단일 spec source 인 specraft(이 프로젝트) 서버로 요청을 보내서 맥락을 가져온다. 첫 맥락은 이 프로젝트에 대한 전체적인 개요, 아키텍쳐 등 포괄적인 정보를 가져온다.
- 만약, claude code or codex 에이전트가 작업하면서 프로젝트에 대한거나 구체 spec 에 대한 내용이 더 필요하다고 판단하면 ibstrom 서버로 query 할 수 있다. query를 받은 specraft 서버는 llm 이 query 에 대해서 구축된 llm-wiki 를 탐색하고 매우 상세하고 구체적인 최신 정보를 응답한다.
- 마찬가지로 세션이 끝날 때 stop hook 으로 항상 반드시, 원격에 떠있는 specraft 서버로 자신의 작업 내용과 갱신된 spec, 기존 spec 에서 수정한 사항, 추가된 사항 등을 전부 보내서 최신화한다. 
- git 처럼 브랜치로 관리할 수도 있다. (그냥 문서 관리에 git을 쓸까?)
- 프로젝트의 git 을 specraft 서버가 알고있다. 로컬에서 specraft 서버로 요청을 보낼때는 로컬 git head 커밋 hash 값을 항상 같이 보낸다. (물론, 이러려면 작업 후 commit -> push 까지 하는걸 plugin 에서 강제해야겠지?) 이렇게 함으로써 아래와 같은 기능이 가능해진다.
- 브랜치 이름은 작업자 로컬의 현재 브랜치와 동일하게 만들어지며(eg. dev 면 ibstrom branch 도 dev, dev 에서 feat/abc 브랜치를 만들었으면 specraft branch 도 feat/abc) 서로 다른 브랜치에 있는 문서들은 독립적이다.
- 코드 브랜치에 merge 되는 순간 문서 브랜치도 동일한 이름의 브랜치에서(eg. feat/abc) 동일한 이름의 브랜치(eg. dev)로 merge 된다. 즉, 코드 브랜치에서 feat/abc 브랜치를 dev 에 merge 하면 문서 브랜치도 feat/abc 브랜치가 dev 에 머지된다.
- 이때 당연히 conflict 가 발생할 수도 있을텐데 1차적으로는 llm 이 판단해서 conflict 를 해결하지만, llm 판단만으로는 해결이 안된다면 conflict 를 내고 병합하지 않는다. 병합되지 않은 상태의 ibstrom 서버는 모든 query, ingest 요청을 거부하여 작업자에게 conflict 가 발생한 사실을 인지시킨다.
- 만약, 동일한 브랜치에 동시에 spec 수정, 추가 등 ingest 요청이 들어온다면 요청으로 같이 온 commit hash 를 보고 git 이력 상 먼저 commit 된 요청 먼저 처리해준다. 즉, git 이력이 A -> B(origin head, 최신) 이고 ingest 요청이 A,B 가 동시에 들어왔다면 A 먼저하고 B 를 처리한다.
- specraft 은 웹 대시보드를 제공한다. 사람이 문서를 열람하고 쿼리할 수 있다.
- 첫 기동시 admin 계정을 만들 수 있으며 admin 은 이 프로젝트에 참여할 사람을 초대할 수 있는 링크를 만들 수 있다. 이 링크를 통해 들어와서 email, password, name 을 입력해야만 이 프로젝트에 참여할 수 있다.
- 각각의 참여자들은 자신의 계정을 api-key 를 발급받으며 이걸로 문서 ingest, query 를 요청할 수 있다. ingest 의 경우 api-key 로 문서 작성(수정)자를 판별하여 기록에 남긴다. query 도 로그로 남겨서 볼 수 있다.