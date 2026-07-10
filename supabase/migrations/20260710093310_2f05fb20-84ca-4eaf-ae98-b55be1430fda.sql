
-- ============ Attendance (Scale) ============
DROP POLICY IF EXISTS "Members can view attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Members can create attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Members can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Members can delete attendance" ON public.attendance_records;

CREATE POLICY "Scale members can view attendance" ON public.attendance_records FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create attendance" ON public.attendance_records FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update attendance" ON public.attendance_records FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete attendance" ON public.attendance_records FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

DROP POLICY IF EXISTS "Members can view leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Members can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Members can update leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Members can delete leave requests" ON public.leave_requests;

CREATE POLICY "Scale members can view leave requests" ON public.leave_requests FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create leave requests" ON public.leave_requests FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update leave requests" ON public.leave_requests FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete leave requests" ON public.leave_requests FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

DROP POLICY IF EXISTS "Members can view leave types" ON public.leave_types;
DROP POLICY IF EXISTS "Members can create leave types" ON public.leave_types;
DROP POLICY IF EXISTS "Members can update leave types" ON public.leave_types;
DROP POLICY IF EXISTS "Members can delete leave types" ON public.leave_types;

CREATE POLICY "Scale members can view leave types" ON public.leave_types FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create leave types" ON public.leave_types FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update leave types" ON public.leave_types FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete leave types" ON public.leave_types FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

DROP POLICY IF EXISTS "Members can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Members can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Members can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Members can delete shifts" ON public.shifts;

CREATE POLICY "Scale members can view shifts" ON public.shifts FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create shifts" ON public.shifts FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update shifts" ON public.shifts FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete shifts" ON public.shifts FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

DROP POLICY IF EXISTS "Members can view time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Members can create time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Members can update time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Members can delete time entries" ON public.time_entries;

CREATE POLICY "Scale members can view time entries" ON public.time_entries FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create time entries" ON public.time_entries FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update time entries" ON public.time_entries FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete time entries" ON public.time_entries FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- ============ Forms (Scale) ============
DROP POLICY IF EXISTS "Members can view forms" ON public.forms;
DROP POLICY IF EXISTS "Members can create forms" ON public.forms;
DROP POLICY IF EXISTS "Members can update forms" ON public.forms;
DROP POLICY IF EXISTS "Members can delete forms" ON public.forms;

CREATE POLICY "Scale members can view forms" ON public.forms FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create forms" ON public.forms FOR INSERT
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update forms" ON public.forms FOR UPDATE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete forms" ON public.forms FOR DELETE
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- form_responses: owner reads gated by Scale via forms; public submission stays open for active forms
DROP POLICY IF EXISTS "Members can view responses" ON public.form_responses;
DROP POLICY IF EXISTS "Authenticated users can submit form response" ON public.form_responses;

CREATE POLICY "Scale members can view responses" ON public.form_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_responses.form_id
      AND f.business_id = get_user_business_id(auth.uid())
      AND business_has_scale_access(f.business_id)
  ));
CREATE POLICY "Anyone can submit to active Scale form" ON public.form_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_responses.form_id
      AND f.is_active = true
      AND business_has_scale_access(f.business_id)
  ));

-- ============ Ticket messages (Growth, via support_tickets) ============
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create ticket messages" ON public.ticket_messages;

CREATE POLICY "Growth users can view ticket messages" ON public.ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.user_id = auth.uid()
      AND business_has_growth_access(t.business_id)
  ));
CREATE POLICY "Growth users can create ticket messages" ON public.ticket_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND t.user_id = auth.uid()
      AND business_has_growth_access(t.business_id)
  ));

-- ============ Contact logs (Growth, via customers) ============
DROP POLICY IF EXISTS "Members can view contact logs" ON public.contact_logs;
DROP POLICY IF EXISTS "Members can create contact logs" ON public.contact_logs;

CREATE POLICY "Growth members can view contact logs" ON public.contact_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = contact_logs.customer_id
      AND c.business_id = get_user_business_id(auth.uid())
      AND business_has_growth_access(c.business_id)
  ));
CREATE POLICY "Growth members can create contact logs" ON public.contact_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = contact_logs.customer_id
      AND c.business_id = get_user_business_id(auth.uid())
      AND business_has_growth_access(c.business_id)
  ));
