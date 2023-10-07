""" Unit Tests for GET Lambda. """
import sys
import os
import json
from http import HTTPStatus
import boto3
from botocore.exceptions import ClientError
from unittest import TestCase
from unittest.mock import MagicMock, patch
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from moto import mock_dynamodb
sys.path.append(os.path.abspath("."))


@mock_dynamodb
class test_get_function(TestCase):
    """ Test GET Lambda. """

    def setUp(self):
        """ Setup before each test. """
        super().setUp()
        self.table_name = 'records'
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
                {'AttributeName': 'createdAt', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
                {'AttributeName': 'createdAt', 'AttributeType': 'S'}
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 1,
                'WriteCapacityUnits': 1
            }
        )
        self.table = self.dynamodb.Table(self.table_name)

        from src.get_function import (
            lambda_handler
        )
        self.lambda_handler = lambda_handler

    def seed_data(self):
        table = self.table
        table.put_item(
            Item={
                'id': 'de305d54',
                'url': 'https://www.google.com',
                'createdAt': '2021-01-01T00:00:00.000Z'
            }
        )
        table.put_item(
            Item={
                'id': '75b4431b',
                'url': 'https://www.example.com',
                'createdAt': '2022-03-08T00:00:00.000Z'
            }
        )

    def test_get_all_items(self):
        """ Test get_all_items function. """
        self.seed_data()
        event = APIGatewayProxyEvent(
                data={
                    "path": "/api/v1/records",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )

        context: LambdaContext = MagicMock()

        response = self.lambda_handler(event, context)

        self.assertEqual(response['statusCode'], HTTPStatus.OK.value)
        self.assertEqual(
            json.loads(response['body'])['Count'], 2
        )
        self.assertEqual(
            json.loads(response['body'])['Items'][0]['id'],
            'de305d54'
        )
        self.assertEqual(
            json.loads(response['body'])['Items'][0]['url'],
            'https://www.google.com'
        )
        self.assertEqual(
            json.loads(response['body'])['Items'][1]['id'],
            '75b4431b'
        )
        self.assertEqual(
            json.loads(response['body'])['Items'][1]['url'],
            'https://www.example.com'
        )

    def test_get_item_by_id(self):
        """ Test get_item_by_id function. """
        self.seed_data()
        event = APIGatewayProxyEvent(
                data={
                    "path": "/api/v1/records/de305d54",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )

        context: LambdaContext = MagicMock()

        response = self.lambda_handler(event, context)
        self.assertEqual(response['statusCode'], HTTPStatus.FOUND.value)
        self.assertEqual(
            json.loads(response['headers']['Location']),
            'https://www.google.com'
        )

    def test_get_item_by_id_not_found(self):
        """ Test get_item_by_id function. """
        self.seed_data()
        event = APIGatewayProxyEvent(
                data={
                    "path": "/api/v1/records/123",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )
        context: LambdaContext = MagicMock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response['statusCode'], HTTPStatus.NOT_FOUND.value)
        self.assertEqual(json.loads(response['body'])['message'], 'Not found')

    @patch('src.get_function.table')
    def test_lambda_handler_error(self, mock_client):
        mock_client.scan.side_effect = ClientError(
            {'Error': {'Code': '500', 'Message': 'Internal Server Error'}},
            'scan'
        )
        event = APIGatewayProxyEvent(
                data={
                    "path": "/api/v1/records/123",
                    "httpMethod": "POST",
                    "headers": {"Content-Type": "application/json"},
                }
            )
        context: LambdaContext = MagicMock()
        response = self.lambda_handler(event, context)
        self.assertEqual(
            response['statusCode'],
            HTTPStatus.INTERNAL_SERVER_ERROR.value
        )
        self.assertEqual(
            json.loads(response['body'])['message'],
            'Internal Server Error'
        )
