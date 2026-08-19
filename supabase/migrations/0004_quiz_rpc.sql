-- A student taking a quiz must never receive is_correct in the payload —
-- RLS is row-level, not column-level, so the plain `quiz_answers_select`
-- policy alone would let a browser call the answers table directly and see
-- which option is correct before submitting. This function is the only path
-- the student-facing "take quiz" screen uses to read questions/answers.
create or replace function get_quiz_for_taking(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_org uuid;
begin
  select * into v_quiz from quizzes where id = p_quiz_id;
  if v_quiz is null then
    return null;
  end if;

  v_org := current_org_v();
  if not (is_super_admin() or v_quiz.organization_id = v_org) then
    raise exception 'Not authorized for this quiz';
  end if;
  if v_quiz.status <> 'published' and not (is_org_admin() or is_super_admin()) then
    raise exception 'Quiz not published';
  end if;

  return jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'kind', v_quiz.kind,
    'pass_score_percent', v_quiz.pass_score_percent,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', qq.id,
        'question_text', qq.question_text,
        'image_url', qq.image_url,
        'position', qq.position,
        'answers', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', qa.id,
            'answer_text', qa.answer_text,
            'position', qa.position
          ) order by qa.position), '[]'::jsonb)
          from quiz_answers qa where qa.question_id = qq.id
        )
      ) order by qq.position), '[]'::jsonb)
      from quiz_questions qq where qq.quiz_id = v_quiz.id
    )
  );
end;
$$;

grant execute on function get_quiz_for_taking(uuid) to authenticated;

-- Grades a submitted attempt server-side against the real is_correct values
-- (never trusts a client-computed score) and stores it.
create or replace function submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz record;
  v_total int;
  v_correct int := 0;
  v_question record;
  v_chosen_answer_id uuid;
  v_score int;
  v_attempt_id uuid;
begin
  select * into v_quiz from quizzes where id = p_quiz_id;
  if v_quiz is null or v_quiz.status <> 'published' then
    raise exception 'Quiz not available';
  end if;
  if not (is_super_admin() or v_quiz.organization_id = current_org_v()) then
    raise exception 'Not authorized for this quiz';
  end if;

  select count(*) into v_total from quiz_questions where quiz_id = p_quiz_id;
  if v_total = 0 then
    raise exception 'Quiz has no questions';
  end if;

  for v_question in select id from quiz_questions where quiz_id = p_quiz_id loop
    v_chosen_answer_id := (p_answers ->> v_question.id::text)::uuid;
    if v_chosen_answer_id is not null and exists (
      select 1 from quiz_answers
      where id = v_chosen_answer_id and question_id = v_question.id and is_correct = true
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  v_score := round((v_correct::numeric / v_total::numeric) * 100);

  insert into quiz_attempts (student_id, quiz_id, score_percent, answers)
  values (auth.uid(), p_quiz_id, v_score, p_answers)
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score_percent', v_score,
    'correct_count', v_correct,
    'total', v_total,
    'passed', v_score >= v_quiz.pass_score_percent
  );
end;
$$;

grant execute on function submit_quiz_attempt(uuid, jsonb) to authenticated;
