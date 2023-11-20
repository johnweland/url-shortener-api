""" Unit Tests for GET Lambda. """
import json
import os
import sys
from http import HTTPStatus
from unittest import TestCase
from unittest.mock import Mock, patch

import boto3
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError
from moto import mock_dynamodb

sys.path.append(os.path.abspath("."))


@mock_dynamodb
class test_get_function(TestCase):
    """Test GET Lambda."""

    def setUp(self):
        """Setup before each test."""
        super().setUp()
        self.table_name = "dev-url-shortner-table"
        self.dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "slug", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 1, "WriteCapacityUnits": 1},
        )
        self.table = self.dynamodb.Table(self.table_name)
        from src.get_function import get_all_items, get_item_by_slug, lambda_handler

        self.lambda_handler = lambda_handler
        self.get_all_items = get_all_items
        self.get_items_by_slug = get_item_by_slug
        self.seed_data()

    def seed_data(self):
        table = self.table
        table.put_item(
            Item={
                "slug": "de305d54",
                "targetUrl": "https://www.google.com",
                "requests": [],
                "createdAt": "2021-01-01T00:00:00.000Z",
            }
        )
        table.put_item(
            Item={
                "slug": "75b4431b",
                "targetUrl": "https://www.example.com",
                "requests": [],
                "createdAt": "2022-03-08T00:00:00.000Z",
            }
        )

    def test_get_current_time(self):
        pass

    def test_get_all_items(self):
        """Test get_all_items function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.OK.value)
        self.assertEqual(json.loads(response["body"])["Count"], 2)
        self.assertEqual(json.loads(response["body"])["Items"][0]["slug"], "de305d54")
        self.assertEqual(
            json.loads(response["body"])["Items"][0]["targetUrl"],
            "https://www.google.com",
        )
        self.assertEqual(json.loads(response["body"])["Items"][1]["slug"], "75b4431b")
        self.assertEqual(
            json.loads(response["body"])["Items"][1]["targetUrl"],
            "https://www.example.com",
        )

    def test_get_item_by_slug(self):
        """Test get_item_by_slug function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/de305d54",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.OK.value)
        self.assertEqual(
            json.loads(response["body"])["targetUrl"], "https://www.google.com"
        )

    def test_get_item_by_slug_not_found(self):
        """Test get_item_by_slug function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/123",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.NOT_FOUND.value)
        self.assertEqual(
            json.loads(response["body"])["message"], "Target URL not found"
        )

    def test_get_all_items_error(self):
        """Test get_all_items function when there is an error."""
        with patch("src.get_function.table.scan") as mock_scan:
            mock_scan.side_effect = ClientError(
                {"Error": {"Code": "500", "Message": "Internal Server Error"}}, "scan"
            )
            event = APIGatewayProxyEvent(
                data={
                    "path": "/",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )
            context: LambdaContext = Mock()
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"], "Internal Server Error"
            )

    def test_get_item_by_slug_error(self):
        """Test get_item_by_slug function when there is an error."""
        with patch("src.get_function.table.get_item") as mock_get_item:
            mock_get_item.side_effect = ClientError(
                {"Error": {"Code": "500", "Message": "Internal Server Error"}},
                "get_item",
            )
            event = APIGatewayProxyEvent(
                data={
                    "path": "/de305d54",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )
            context: LambdaContext = Mock()
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"], "Internal Server Error"
            )

    def tearDown(self) -> None:
        return super().tearDown()
