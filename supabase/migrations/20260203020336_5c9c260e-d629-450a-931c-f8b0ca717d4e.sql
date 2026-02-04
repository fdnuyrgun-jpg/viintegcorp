-- расширяем права на удаление постов/лайков/комментов, чтобы автор поста мог удалить пост целиком

-- POSTS: allow admin delete too
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users or admins can delete posts"
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- POST_LIKES: allow like owner OR post owner OR admin to delete
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can delete likes"
ON public.post_likes
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- POST_COMMENTS: allow comment owner OR post owner OR admin to delete
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete comments"
ON public.post_comments
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
