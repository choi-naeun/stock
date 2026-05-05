-- 머니투데이 RSS는 https://rss.mt.co.kr/mt_stock.xml 가 404를 반환 (운영 중 확인됨).
-- 새 URL을 찾을 때까지 비활성화. 다른 매체에서 충분한 커버리지가 나오므로 분석에 영향 없음.

update public.news_sources set active = false where code = 'mt';
