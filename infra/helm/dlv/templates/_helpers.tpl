{{/* Base name */}}
{{- define "dlv.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Fully qualified release name */}}
{{- define "dlv.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "dlv.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "dlv.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Common (non-selector) labels */}}
{{- define "dlv.commonLabels" -}}
helm.sh/chart: {{ include "dlv.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: digital-legacy-vault
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}

{{/*
Build an image reference.
Usage: include "dlv.image" (dict "root" $ "img" .Values.api.image)
*/}}
{{- define "dlv.image" -}}
{{- $reg := .root.Values.global.imageRegistry -}}
{{- $tag := .img.tag | default .root.Chart.AppVersion -}}
{{- if $reg -}}
{{- printf "%s/%s:%s" $reg .img.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .img.repository $tag -}}
{{- end -}}
{{- end -}}
