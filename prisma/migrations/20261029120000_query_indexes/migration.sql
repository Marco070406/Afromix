-- Index pour les requêtes fréquentes (tendances par période, événements à venir, classement des DJs)

-- CreateIndex
CREATE INDEX "stream_events_createdAt_idx" ON "stream_events"("createdAt");

-- CreateIndex
CREATE INDEX "events_status_startAt_idx" ON "events"("status", "startAt");

-- CreateIndex
CREATE INDEX "artist_profiles_followerCount_idx" ON "artist_profiles"("followerCount");
