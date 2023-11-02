""" GET Lambda. """
import json
from datetime import datetime, timezone
from http import HTTPStatus
from os import environ

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    Response,
    content_types,
)
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError

APP_NAME = environ.get("APP_NAME") or "url-shortener GET"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


def get_current_time() -> str:
    """Get current time in ISO format."""
    return (
        datetime.now(tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


@app.get("/")
@trace.capture_method
def get_all_items() -> Response:
    """Get all items from DynamoDB table."""
    try:
        response = table.scan()
        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=json.dumps(
                {
                    "Count": response["Count"],
                    "Items": response["Items"],
                    "Scanned": response["ScannedCount"],
                }
            ),
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


@app.get("/<slug>")
@trace.capture_method
def get_item_by_slug(slug: str) -> Response:
    """Get a item from DynamoDB table."""

    try:
        item = table.get_item(Key={"slug": slug}).get("Item")

        if not item:
            log.error("URL not found")
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                body=json.dumps({"message": "Target URL not found"}),
            )

        referer = app.current_event.multi_value_headers.get("Referer")
        if referer:
            referer = referer[0]
        else:
            referer = None
        user_agent = app.current_event.request_context.identity.user_agent
        source_ip = app.current_event.request_context.identity.source_ip

        table.update_item(
            Key={"slug": slug},
            UpdateExpression="SET #requests = list_append(#requests, :request)",
            ExpressionAttributeNames={"#requests": "requests"},
            ExpressionAttributeValues={
                ":request": [
                    {
                        "ip": source_ip,
                        "userAgent": user_agent,
                        "referer": referer,
                        "timestamp": get_current_time(),
                    }
                ]
            },
        )

        return Response(
            status_code=HTTPStatus.FOUND.value,
            content_type=content_types.APPLICATION_JSON,
            headers={
                "Location": str(item["targetUrl"]),
                "Access-Control-Allow-Origin": "*",
            },
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


@trace.capture_lambda_handler
def lambda_handler(
    event: APIGatewayProxyEvent, context: LambdaContext
) -> dict[str, any]:
    """Lambda handler."""
    return app.resolve(event, context)
